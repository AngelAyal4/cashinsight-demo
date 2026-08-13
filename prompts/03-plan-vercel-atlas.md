# Plan — Deploy Vercel + Atlas M0 (producción definitiva)

> Rol del ejecutor: ejecutar este plan de punta a punta. NO modificar `AGENTS.md`, `.env*`, ni la constitution. Sin features fuera de spec (sin dominio, Sentry, multi-usuario).
> Espec fuente: `specs/deploy-vercel-atlas.md`. Prompts previos: `prompts/01-orquestador-vercel-atlas.md`, `prompts/02-ejecutor-vercel-atlas.md`.

## 0. Hechos verificados por el orquestador (no re-investigar)

- Repo limpio en `main` (último commit `df8e77b`), node 22.23.1 / npm 10.9.8.
- Host **sin** `mongosh`/`mongodump`/`mongorestore`/CLI `vercel` → usar `docker exec cashinsight-mongo <tool>` (imagen `mongo:7` las incluye; el contenedor tiene salida a internet para alcanzar Atlas).
- `forgotPOST()` se invoca sin args en `src/test/password-reset.test.ts` (líneas 61, 90, 113) → actualizar al cambiar la firma.
- `scripts/verify-pwa.mjs <URL>` verifica SW `activated` + manifest → reutilizable contra Vercel tal cual.
- Tests: Mongo real `cashinsightapp_test` (src/test/setup.ts), corren en serie (`fileParallelism: false`), coverage con include explícito por archivo (vitest.config.ts).
- `.gitignore` cubre `.env`, `.env.production`, `backups/`, `evidencia/`.
- Dockerfile (runner) copia `.next/standalone` → el build local DEBE seguir generándolo (criterio 6).
- Contenedores Docker corriendo: `cashinsight-mongo`, `cashinsight-app`, `cashinsight-tunnel` (deploy anterior, plan B).

## 1. Verificaciones previas (gates — si algo falla, STOP)

| # | Comando | Esperado |
|---|---|---|
| 1.1 | `git status --short` y `git branch --show-current` | vacío / `main` |
| 1.2 | `docker compose ps` | `cashinsight-mongo` running/healthy (los tests usan `localhost:27017`) |
| 1.3 | `npm run test` | 208/208 verdes (baseline) |
| 1.4 | `npm run lint` | sin errores |
| 1.5 | `npm run build` + `ls .next/standalone/server.js` | build verde + standalone existe (baseline) |

Guardar salidas crudas en `evidencia/vercel-atlas/00-baseline.log`.

## 2. Cambios de código/infra (orden de la spec sección 4)

### 2.1 `next.config.ts` — standalone condicional

Cambio único: `output: 'standalone',` → `output: process.env.VERCEL ? undefined : 'standalone',`. **No tocar** los headers de `/sw.js`.

Verificación inmediata (criterio 6, evidencia `evidencia/vercel-atlas/01-next-config.log`):
- `rm -rf .next && VERCEL=1 npm run build` → compila y `ls .next/standalone` **falla** (no existe).
- `rm -rf .next && npm run build` → compila y `ls .next/standalone/server.js` **existe** (Docker intacto).

### 2.2 Rate limiting — `src/models/RateLimit.ts` + `src/lib/rate-limit.ts`

**Modelo nuevo** (convención del repo, patrón `src/models/User.ts`): schema `{ key (String, required, unique), count (Number, default 0), resetAt (Date, required) }` + `rateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 })` (TTL → colección `ratelimits` autolimpiable). Exportar con el patrón `mongoose.models.RateLimit || mongoose.model(...)`.

**Módulo** `src/lib/rate-limit.ts`, sin dependencias npm nuevas, TypeScript strict, sin `any`:
- Constantes exportadas: `RATE_LIMIT_MAX_ATTEMPTS = 10`, `RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000`.
- `getClientIp(request: Request): string`: primer hop de `x-forwarded-for` (split `,` → trim) o fallback `'unknown'`.
- `isRateLimited(route: string, request: Request): Promise<boolean>`:
  - Ventana fija alineada al reloj: `windowStart = Math.floor(Date.now() / WINDOW) * WINDOW`; `key = \`${route}:${ip}:${windowStart}\``.
  - Índices una vez por cold start: flag module-level + `await RateLimit.init()`.
  - **Un solo** `findOneAndUpdate` atómico:
    `RateLimit.findOneAndUpdate({ key }, { $inc: { count: 1 }, $setOnInsert: { resetAt: new Date(windowStart + WINDOW) } }, { upsert: true, new: true })` → retorna `doc.count > MAX`.
  - Precondición: el caller ya hizo `connectDB()`.
- `rateLimitResponse()`: `NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo más tarde.' }, { status: 429 })` (mensaje exacto de la spec §4.2).

**Integración en las 4 rutas** — patrón uniforme, primeras líneas dentro del `try`:

```ts
await connectDB();
if (await isRateLimited('<ruta>', request)) return rateLimitResponse();
```

- `src/app/api/auth/login/route.ts` (key `'login'`): subir el `connectDB()` existente (línea 31) arriba; eliminar el duplicado posterior.
- `src/app/api/auth/register/route.ts` (key `'register'`): idem; `User.init()` se mantiene después.
- `src/app/api/auth/forgot/route.ts` (key `'forgot'`): **cambiar firma `export async function POST()` → `POST(request: Request)`**.
- `src/app/api/auth/reset/route.ts` (key `'reset'`): idem.
- Actualizar `src/test/password-reset.test.ts` (3 calls, líneas 61/90/113): `forgotPOST()` → `forgotPOST(new Request('http://localhost/api/auth/forgot', { method: 'POST' }))`.

### 2.3 Tests — nuevo `src/test/rate-limit.test.ts`

Patrón de `src/test/api-routes.test.ts` (DB real `cashinsightapp_test`, cookieJar mockeado de `next/headers`, `beforeAll connectDB` / `afterAll mongoose.disconnect()` / `beforeEach` limpia `RateLimit` + `User`). Casos:

1. **11 intentos → 429**: user creado; 10 × `loginPOST` con password incorrecta + header `x-forwarded-for: 1.2.3.4` → todas `401`; la 11ª → `429` con el mensaje exacto.
2. **IP distinta no bloquea / ventana nueva libera**: bloqueada IP `1.2.3.4`, request con `5.6.7.8` → `401` (no 429); `await RateLimit.deleteMany({})` (simula ventana nueva/TTL) → misma IP vuelve a `401`.
3. **Rutas privadas no afectadas**: sembrar `RateLimit` con `count: 99` para key de login+IP; con sesión válida, `categoriesGET` → nunca `429`.
4. **Contador por ruta**: login bloqueado no bloquea `register` con la misma IP.

Agregar `'src/lib/rate-limit.ts'` al `coverage.include` de `vitest.config.ts` (convención: todos los lib listados explícitamente).

Correr `npm run test` completo → evidencia `evidencia/vercel-atlas/02-tests.log` (208 + ≥4 nuevos).

### 2.4 `.env.example`

Sumar bloque comentado (sin valores reales):

```
# Produccion (Vercel + Atlas): configurar en Vercel → Project Settings → Environment Variables
# MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/cashinsightapp   (requerida)
# JWT_SECRET=$(openssl rand -base64 32)   (requerida, NUEVA, distinta de dev)
```

Mantener lo existente (dev + docker).

### 2.5 `scripts/backup.sh`

- URI: prioridad `$MONGODB_URI` del entorno; si no, `set -a; . ./.env; set +a` (si existe); si sigue vacía → error claro + `exit 1`.
- Dump: `docker exec "${MONGO_CONTAINER:-cashinsight-mongo}" mongodump --uri "$MONGODB_URI" --archive | gzip > backups/atlas-cashinsight-$(date +%Y%m%d-%H%M%S).gz` (mantener el chequeo de contenedor corriendo).
- Mantener: chequeo de archivo no vacío, retención 14 días (patrón `atlas-cashinsight-*.gz`), salida legible. **Nunca imprimir la URI** (contiene password).

### 2.6 `docs/runbook-produccion.md` — sección nueva "Deploy Vercel + Atlas"

Guía para el **usuario** (el ejecutor no toca cuentas externas):

1. **Atlas**: crear cluster M0 `cashinsight`; Database User con password `openssl rand -base64 24` y rol `readWriteAnyDatabase` (nunca admin); Network Access `0.0.0.0/0` (serverless sin IP fija; mitigado con password fuerte + rate limiting); copiar URI `mongodb+srv://…`.
2. **Vercel**: import del repo GitHub, framework Next.js auto-detectado, **sin `vercel.json`**; env vars `MONGODB_URI` + `JWT_SECRET` (nuevo, `openssl rand -base64 32`); Deploy.
3. **Migración local→Atlas** (comandos exactos, vía docker exec por falta de tools en host):

```bash
docker exec cashinsight-mongo mongodump --uri mongodb://127.0.0.1:27017/cashinsightapp --archive | gzip > backups/local-pre-vercel.gz
gunzip -c backups/local-pre-vercel.gz | docker exec -i cashinsight-mongo mongorestore --uri "<ATLAS_URI>" --archive --drop
```

Verificación de conteos:

```bash
docker exec cashinsight-mongo mongosh "<URI>" --quiet --eval 'db.transactions.countDocuments({}); db.categories.countDocuments({}); db.savingsgoals.countDocuments({}); db.budgets.countDocuments({}); db.users.countDocuments({})'
```

comparando Atlas vs local (mismo comando con la URI local).

4. **Token de recuperación**: dashboard Vercel → Logs/Functions → ahí aparece el `console.log('[RECUPERACIÓN]…')` del endpoint forgot.
5. **Backup/restore Atlas**: `MONGODB_URI=<atlas> ./scripts/backup.sh`; restore al contenedor descartable local (patrón sección 7 del runbook) o a Atlas con `--drop` (aviso destructivo).
6. Nota: M0 **sin backups automáticos** → backup manual obligatorio post-migración y ante cambios importantes.

## 3. Plan de deploy (usuario ejecuta cuentas externas; ejecutor prepara y verifica)

1. Ejecutor: pasos 1–2 con gates verdes → commits Conventional Commits (ej. `feat: rate limiting auth + standalone condicional Vercel`, `feat: backup script contra Atlas`, `docs: runbook deploy Vercel + Atlas`) → push a `main`.
2. Usuario: crea cluster Atlas + usuario + IP list (runbook §2.6.1) y provee la URI al ejecutor por canal local (queda en `.env`/entorno, **nunca** versionada ni en evidencia sin redactar).
3. Usuario: importa repo en Vercel, setea env vars, primer deploy.
4. Ejecutor (con URI provista): corre migración §2.6.3 y verifica conteos Atlas == local.
5. Ejecutor: corre verificación de los 10 criterios (sección 4) y archiva evidencia.

## 4. Plan de verificación (criterios spec §7 → comando → evidencia)

| Criterio | Verificación | Evidencia en `evidencia/vercel-atlas/` |
|---|---|---|
| 1 | `curl -sS -o /dev/null -w '%{http_code}\n' https://<proyecto>.vercel.app/login` → `200` | `10-c1.log` |
| 2 | `curl -c /tmp/cj -X POST https://<proyecto>.vercel.app/api/auth/login -H 'Content-Type: application/json' -d '{"email":"prueba@cashinsight.app","password":"<pass>"}'` → `200`; conteos mongosh Atlas == local (diff vacío) | `10-c2.log` (passwords redactadas) |
| 3 | POST `/api/transactions` con cookie → `201`; doc visible vía mongosh Atlas; tras Redeploy, GET sigue mostrándolo | `10-c3.log` |
| 4 | `for i in $(seq 1 11); do curl -s -o /dev/null -w '%{http_code}\n' -X POST https://<proyecto>.vercel.app/api/auth/login -H 'Content-Type: application/json' -d '{"email":"x@x.com","password":"wrongpass1"}'; done` → diez `401` + un `429`; liberación por ventana: cubierta por test unit (referencia `02-tests.log`) | `10-c4.log` |
| 5 | `curl -sS -o /dev/null -w '%{http_code}\n' https://<proyecto>.vercel.app/manifest.webmanifest` → `200`; `node scripts/verify-pwa.mjs https://<proyecto>.vercel.app` → `"ok": true`, `state: "activated"` | `10-c5.log` |
| 6 | Ya verificado en paso 2.1 (ambos builds) | `01-next-config.log` |
| 7 | `MONGODB_URI=<atlas> ./scripts/backup.sh` → `.gz` no vacío (`ls -la backups/`); restore probado en contenedor descartable (patrón sección 7 del runbook) + conteos | `10-c7.log` |
| 8 | `git status --short` limpio; `git check-ignore -v .env .env.production`; `git diff | grep -iE 'mongodb+srv|JWT_SECRET'` → solo placeholders | `10-c8.log` |
| 9 | `npm run test && npm run lint && npm run build` → verde sobre el árbol final | `10-c9.log` |
| 10 | `grep -n 'Deploy Vercel' docs/runbook-produccion.md` + checklist de subsecciones (Atlas, env vars, migración, logs token, backup/restore) | `10-c10.log` |

## 5. Riesgos a vigilar durante la ejecución (spec §8 + detectados)

- **`0.0.0.0/0` en Atlas**: confirmar password fuerte y rate limit activo (criterio 4) **antes** de difundir la URL.
- **Contador en Mongo** (1 escritura por intento): aceptado para single-user; NO "optimizar" con nada fuera de spec.
- **M0 sin backups**: primer backup Atlas inmediatamente post-migración — no dejarlo "para después".
- **Doble pipeline standalone**: los DOS builds del criterio 6 antes de push; si falla el condicional, el Dockerfile rompe.
- **`--drop` destructivo**: dump local `backups/local-pre-vercel.gz` ANTES del restore a Atlas; verificar conteos post-restore.
- **Firma de `forgot`**: actualizar los 3 calls en `password-reset.test.ts` o los tests existentes rompen.
- **TTL monitor de Atlas** corre ~cada 60s: no afecta corrección (la key incluye la ventana); no improvisar limpieza manual.
- **Secretos en evidencia**: `evidencia/` está gitignored, pero redactar igual URIs con password y JWT en los logs.

## 6. Dónde guardar evidencia

`evidencia/vercel-atlas/` (gitignored). **Logs crudos de comandos reales** (`<comando> 2>&1 | tee evidencia/vercel-atlas/<nombre>.log`), nombrados por criterio según la tabla de la sección 4. Prohibido describir en vez de adjuntar salida.
