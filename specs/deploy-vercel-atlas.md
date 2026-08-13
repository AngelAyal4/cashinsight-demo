# Spec — Deploy Vercel + Atlas M0 (producción definitiva)

> Fecha: 2026-08-13 · Estado: para orquestador/ejecutor · Prioridad: alta
> Decisión cerrada con el usuario: **todo en Vercel** (Next fullstack, API routes nativas) + **Atlas M0** (Mongo free). Descartado back separado en Railway/Render: la app es Next fullstack (API routes en el mismo proceso), separar implicaría reescribir la capa API + CORS + cookies cross-site sin beneficio para un MVP single-user; Vercel + Atlas M0 = $0/mes.

## 1. Contexto y objetivo

CashinsightApp está lista (208 tests, build verde, PWA, notificaciones, gastos de pareja con split configurable, ahorro externo). La demo local por Cloudflare Tunnel fue **cancelada** (2026-08-11) y la decisión de producción es:

- **Frontend + API routes en Vercel** (Hobby, $0): la app Next completa, API routes nativas serverless. No hay "back separado" — el back vive en `src/app/api/*` del mismo repo (verificado: db.ts, proxy.ts, 20+ rutas).
- **MongoDB Atlas M0** (free forever, 512MB): reemplaza el `mongo` local en Docker.
- Los datos actuales de dev (cuenta `prueba@cashinsight.app`, categorías, movimientos, metas, presupuestos) se **migran** al cluster Atlas (mongodump → mongorestore).
- El runbook Docker (`docs/runbook-produccion.md`) queda como **plan B (VPS)** y referencia de backup/restore.

## 2. Stack de deploy

| Pieza | Elección |
|---|---|
| Host app | Vercel (Hobby, $0) — import del repo GitHub, framework auto-detectado (Next.js), sin `vercel.json` (no hace falta) |
| DB | Atlas M0 (free) — cluster `cashinsight`, usuario app con rol `readWriteAnyDatabase` (nunca admin), IP access list `0.0.0.0/0` (serverless no tiene IP fija; mitigado con password fuerte + rate limiting) |
| Env vars | Panel Vercel → Project Settings → Environment Variables: `MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/cashinsightapp` + `JWT_SECRET=<openssl rand -base64 32>` (nuevo, distinto del de dev). **Nunca** en el repo. |
| Build | Next.js 16 + Turbopack; respeta `.npmrc` (`legacy-peer-deps=true`, ya existe para Tremor/React 19) |
| Rate limiting | Nuevo, sin dependencias npm: ventana fija por IP (`x-forwarded-for`) en `/api/auth/login|register|forgot|reset`, contador en colección Mongo con TTL index → `429` |
| Backup | Adaptar `scripts/backup.sh` a `mongodump --uri "$MONGODB_URI"` contra Atlas (M0 NO tiene backups automáticos) + doc de restore |

## 3. Pre-check serverless (ya verificado, no re-hacer)

- `src/lib/db.ts`: singleton con cache global (`global.mongoose`) — correcto para funciones serverless. Sin cambios.
- Sin `fs`/`process.cwd`/escritura a disco en `src/` (grep limpio) — seguro en funciones efímeras.
- Rollover mensual **lazy** (primer request del mes, idempotente) — serverless-friendly, sin cron.
- `MONGODB_URI` con fallback localhost — apuntará a Atlas vía env var.
- Sin `NEXT_PUBLIC_*` — nada sensible llega al bundle del cliente.
- Cookie de sesión ya `secure` en producción; bajo HTTPS de Vercel funciona sin cambios.

## 4. Cambios de código/infra

1. **`next.config.ts`**: condicionar standalone solo para docker:
   `output: process.env.VERCEL ? undefined : 'standalone'`
   (en Vercel la variable `VERCEL` está definida → pipeline propio; el Dockerfile local sigue generando standalone igual que hoy). NO tocar los headers de `/sw.js`.
2. **Rate limiting** (nuevo, módulo `src/lib/rate-limit.ts`):
   - Ventana fija: `N=10` intentos / `W=15min` por `(ruta, ip)`, ip = `x-forwarded-for` (primer hop) o fallback `unknown`.
   - Persistencia: colección `ratelimits` `{ key, count, resetAt }` con TTL index en `resetAt` (limpieza automática), upsert atómico.
   - Aplicar en `login`, `register`, `forgot`, `reset` (POST). Excedido → `429 { error: 'Demasiados intentos. Probá de nuevo más tarde.' }`.
   - No aplica al resto de `/api/*` (rutas con sesión ya protegidas por proxy).
   - Tests: 11 intentos seguidos → 429; ventana distinta no bloquea; rutas privadas no afectadas.
3. **`.env.example`**: documentar `MONGODB_URI` y `JWT_SECRET` como requeridos en producción.
4. **`scripts/backup.sh`**: leer `MONGODB_URI` desde `.env` local (nunca versionado) y hacer `mongodump --uri "$MONGODB_URI" --archive | gzip > backups/atlas-cashinsight-YYYYMMDD-HHMMSS.gz` + retención 14 días + salida legible. `restore` documentado en runbook.
5. **`docs/runbook-produccion.md`**: sección nueva "Deploy Vercel + Atlas" con: crear cluster Atlas + usuario + IP access list, importar repo en Vercel, setear env vars, migración de datos local→Atlas (`mongodump` local → `mongorestore --uri <ATLAS>`), dónde ver el token de recuperación (logs de función en dashboard Vercel), backup/restore contra Atlas.

## 5. Migración de datos (local → Atlas)

```bash
# 1. Dump del mongo local (docker)
docker exec cashinsight-mongo mongodump --uri mongodb://127.0.0.1:27017/cashinsightapp --archive | gzip > backups/local-pre-vercel.gz
# 2. Restore a Atlas (una vez creado el cluster y la URI)
gunzip -c backups/local-pre-vercel.gz | mongorestore --uri "mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/cashinsightapp" --archive --drop
# 3. Verificar conteos en Atlas (mongosh)
```

## 6. Comportamiento esperado

- `https://<proyecto>.vercel.app` sirve la app completa (login, dashboard, PWA, notificaciones, reportes) con los datos migrados.
- La primera request de cada mes dispara el rollover lazy (igual que local).
- El token de recuperación de contraseña se imprime en los **logs de la función** (dashboard Vercel → Functions → Logs) — mismo diseño que el contenedor local, distinta ventana.
- PWA instalable desde el dominio Vercel: `/manifest.webmanifest` y `/sw.js` servidos (public/ incluido por el framework).
- Rate limiting activo en los 4 endpoints públicos de auth.

## 7. Criterios de aceptación (verificables, todos con evidencia)

1. `vercel deploy` (o push a main con GitHub Integration) termina OK; `https://<proyecto>.vercel.app/login` responde 200.
2. Login real `prueba@cashinsight.app` funciona en Vercel con los datos migrados (mismo conteo de transacciones/categorías/metas que el local).
3. Registrar un gasto en Vercel se refleja en Atlas (`mongosh` al cluster) y persiste tras redeploy.
4. `curl -X POST https://<proyecto>.vercel.app/api/auth/login` × 11 → 11º responde `429`; ventana de 15 min lo libera (verificable acortando la ventana en test).
5. `/manifest.webmanifest` responde 200 y SW se registra (state activated) bajo el dominio Vercel.
6. `next.config.ts` condicional: `VERCEL=1 npm run build` compila sin standalone; build local sin VERCEL sigue generando `.next/standalone` (Docker intacto).
7. `scripts/backup.sh` produce un `.gz` no vacío contra Atlas y el restore se probó al menos una vez.
8. `git status` limpio de secretos: sin `MONGODB_URI`/`JWT_SECRET` reales en el diff; `.env`/`.env.production` ignorados.
9. `npm run test` / `npm run lint` / `npm run build` verdes sobre el árbol final (incluye tests de rate limit).
10. Runbook Vercel documenta: creación Atlas, env vars, migración, logs de token, backup/restore.

## 8. Riesgos y mitigaciones

- **IP access list 0.0.0.0/0 en Atlas**: necesario porque Vercel serverless no tiene IP fija. Mitigación: usuario dedicado con password fuerte (`openssl rand -base64 24`), rate limiting en auth, sin datos sensibles reales. Alternativa futura: Atlas PrivateLink (pago) o VPS.
- **Rate limiting con contador en Mongo**: cada intento escribe en DB (lento bajo ataque). Aceptable para single-user; si crece, migrar a Upstash Ratelimit (edge).
- **M0 sin backups**: el backup manual contra Atlas es OBLIGATORIO (cron local o recordatorio). Sin esto, un borrado = pérdida total.
- **Doble pipeline standalone**: si el condicional falla, Vercel puede generar standalone innecesario o el Docker build romperse — el criterio 6 lo cubre.
- **Datos locales**: la migración es `--drop` (destructiva sobre Atlas, no sobre local); el dump local queda como respaldo.

## 9. Fuera de scope (post-deploy)

Dominio propio (`.com` ~$10.45/año en Cloudflare, opcional también en Vercel), monitoreo/alertas (Sentry), VPS como alternativa, multi-usuario, export CSV/PDF (requiere fs → no en serverless, o VPS).
