# Plan — Hardening y calidad runtime pre-deploy

> **Rol del ejecutor:** ejecutar este plan de punta a punta. NO modificar `AGENTS.md`, `constitution.md`, `.env*` ni las specs. Sin features fuera de spec.
> **Spec fuente:** `specs/hardening-runtime-predeploy.md`. Relacionada: `specs/deploy-vercel-atlas.md`. Prompt origen: `prompts/01-orquestador-hardening-runtime-predeploy.md`.

## 0. Hechos verificados por el orquestador (no re-investigar)

- **`git status` NO está limpio**: el árbol contiene una implementación ya aplicada (sin commit) de la mayoría de esta spec, con evidencia en `evidencia/hardening-runtime-predeploy/` (gitignored). Detalle en §1.
- `next.config.ts` ya tiene `poweredByHeader: false` y `output: process.env.VERCEL ? undefined : 'standalone'` + headers de `/sw.js` intactos.
- `src/app/api/seed/route.ts` ya está eliminado del árbol (` D` en git status). Los manifests del build actual (`.next/app-path-routes-manifest.json`, `.next/routes-manifest.json`) tienen **0** referencias a `api/seed`.
- El reemplazo del seed ya existe: `src/lib/seed.ts` (`seedDemoData()`, idempotente, sin datos de request) + CLI `scripts/seed-local.ts` (guard anti-remota con `SEED_ALLOW_REMOTE=1`) + loader `scripts/ts-path-loader.mjs` (alias `@/` para type-stripping de Node 22, sin deps nuevas) + tests `src/test/seed.test.ts` (5 tests).
- Gates reutilizables ya creados: `scripts/verify-bundle.mjs`, `scripts/verify-surface.mjs`, `scripts/verify-console.mjs` (CDP con Chrome headless del sistema, **cero dependencias npm nuevas**) + `scripts/bundle-budget-exceptions.json`.
- Evidencia existente reporta todo verde: 234/234 tests (28 archivos), tsc 0 errores, lint limpio, build local + `VERCEL=1` verdes, `npm audit` 0 vulnerabilidades, bundle/surface/console PASS.
- Node `v22.23.1`, Chrome en `/usr/bin/google-chrome`. Mongo local: `docker compose up -d mongo` → `127.0.0.1:27017` (el servicio `app` de compose ocupa el puerto 3000).
- `SECURITY-CHECKLIST.md` (citado por la spec §8) **no existe en el repo**; no bloquea.
- `src/app/metas/page.tsx` importa Recharts directamente (ruta dashboard, budget 250 KB); `/` ya tiene `ExpensesDonutChart` con `next/dynamic ssr:false`. `/login` y `/register` NO cargan Recharts/Tremor.

## 1. Estado actual del árbol (implementación aplicada, sin commit)

| Cambio | Estado |
|---|---|
| `next.config.ts` → `poweredByHeader: false` | aplicado (M) |
| `src/app/api/seed/route.ts` | eliminado (D) |
| `src/lib/seed.ts`, `scripts/seed-local.ts`, `scripts/ts-path-loader.mjs`, `src/test/seed.test.ts` | creados (??) |
| `scripts/verify-{bundle,surface,console}.mjs`, `scripts/bundle-budget-exceptions.json` | creados (??) |
| `src/app/page.tsx` → donut con `next/dynamic` | aplicado (M) |
| `src/test/api-routes.test.ts` → usa `seedDemoData()` en vez de la ruta | aplicado (M) |
| `public/sw.js` → fix de cache-first con respuestas redirigidas (bug real encontrado por el gate de consola) | aplicado (M) |

**Decisión del orquestador:** el ejecutor NO re-implementa. Trata el árbol como *implementación bajo revisión*: verifica (Fase 2), cierra las brechas de §4 (Fase 3), re-corre gates (Fase 4) y commitea (§10).

## 2. Fase 0 — Snapshot de seguridad (antes de tocar nada)

```bash
git status --short > backups/hardening-pre-plan.status
git diff > backups/hardening-pre-plan.patch
git diff --stat
```

(`backups/` está gitignored.) Esto permite restaurar el estado exacto si algo sale mal (ver §9).

## 3. Fase 1 — Baseline y definición de budgets

### 3.1 Baseline reproducible (registrar en `evidencia/hardening-runtime-predeploy/01-baseline-*.log`)

```bash
docker compose up -d mongo
npm run test            # esperado: 234/234 (28 archivos)
npm run test:coverage   # esperado: ≥70% en los 4 umbrales (hoy ~86% líneas)
npx tsc --noEmit        # 0 errores
npm run lint            # 0 errores
npm run build           # verde; genera .next/standalone (Docker intacto)
npm audit --audit-level=high   # 0 vulnerabilidades
```

Registrar además: headers actuales (`curl -sI http://localhost:3100/login` contra el standalone de verificación), rutas del build (`cat .next/app-path-routes-manifest.json`), y tamaños (lo produce `verify-bundle.mjs`).

### 3.2 Métrica y budgets (definición cerrada, no se discute en ejecución)

- **Métrica "JS inicial de una ruta":** Σ de tamaños **gzip** de los chunks únicos `/_next/static/chunks/*.js` referenciados en el HTML inicial de esa ruta, medido contra un **build de producción** servido (nunca dev/Turbopack HMR). Lo mide `scripts/verify-bundle.mjs`.
- **No confundir:** *total de chunks del build* = todos los archivos emitidos (incluye lazy chunks que solo se transfieren bajo demanda); *raw* = sin comprimir. Ambos se reportan como baseline informativo; **ningún budget se evalúa sobre ellos**.
- **Budgets (gzip):** chunk individual ≤ 102 400 B · rutas auth/públicas (`/login`, `/register`) ≤ 153 600 B · rutas dashboard (`/`, `/control`, `/metas`, `/perfil`, `/report`, `/help`, `/onboarding`) ≤ 256 000 B.
- **Excepciones:** solo vía `scripts/bundle-budget-exceptions.json` con tamaño medido, motivo, ruta y plan de reducción (ya existen 2: `/login` y `/register`, baseline de framework ~156 KB: react-dom + runtime Turbopack + polyfills).

## 4. Brechas detectadas por el orquestador (lo único que falta implementar)

1. **`package.json` no registra los comandos.** `src/lib/seed.ts` (línea 16) referencia `npm run seed:local`, pero ese script **no existe**; tampoco hay atajos para los verificadores.
2. **Comentario de uso incorrecto** en `scripts/seed-local.ts` (línea 4): indica `node scripts/ts-path-loader.mjs scripts/seed-local.ts --run`, que no funciona (el loader debe ir con `--import` y hace falta el flag de type-stripping).
3. **Sin documentación del seed**: `docs/runbook-produccion.md` no menciona el seed (grep vacío). La spec exige comando documentado + advertencia Atlas.
4. **`verify-bundle.mjs`, dos debilidades:**
   - Las rutas dashboard extendidas solo se miden si el script mismo levantó el server (`serverStarted && ...`); al reutilizar un server se omiten, y además son **solo informativas** (sin enforcement del budget de 250 KB).
   - Los samples de source map están hardcodeados (`webpack.js.map` ni siquiera existe en builds Turbopack → el check pasa trivialmente). Debe muestrear archivos reales de `.next/static/chunks/*.js`.
5. **(Menor)** Sin test unitario que proteja `poweredByHeader: false` de una regresión.

## 5. Fase 2 — Verificación de la implementación existente (sin cambios)

Levantar el entorno de verificación (reproducir tal cual `evidencia/hardening-runtime-predeploy/00-reporte-final.md` §"Cómo reproducir"):

```bash
npm run build
cp -r .next/static .next/standalone/.next/
mkdir -p .next/standalone/public && cp -r public/* .next/standalone/public/
MONGODB_URI=mongodb://localhost:27017/cashinsightapp_console \
  node --experimental-strip-types --import ./scripts/ts-path-loader.mjs scripts/seed-local.ts
PORT=3100 HOSTNAME=127.0.0.1 MONGODB_URI=mongodb://localhost:27017/cashinsightapp_console \
  JWT_SECRET=console-verify-secret-2026 node .next/standalone/server.js &
```

Luego:

- **Headers:** `node scripts/verify-surface.mjs` — sin `X-Powered-By` en `/login` ni en API; headers de `/sw.js` intactos (`Cache-Control: no-cache, no-store, must-revalidate`, `Content-Type: application/javascript; charset=utf-8`) — verificar además con `curl -sI http://localhost:3100/sw.js`.
- **Seed ausente:** `/api/seed` GET/POST → 401 sin sesión / 404 con sesión, jamás 200 ni datos. **Decisión documentada:** el 401 sin sesión es la respuesta genérica del proxy para TODO `/api/*` no-auth (idéntica para una ruta inexistente cualquiera) → no revela que existió una operación de seed; cumple el criterio de la spec ("404 genérico o no existe").
- **Consola:** `node scripts/verify-console.mjs` — 20 pasos (ver §7).
- **Bundle:** `node scripts/verify-bundle.mjs` — PASS con excepciones documentadas; `/` ≈193 711 B gzip tras el dynamic import.

Si todo reproduce los PASS existentes → pasar a Fase 3. Si algo difiere → STOP, comparar con `evidencia/hardening-runtime-predeploy/*.log` previos y resolver antes de seguir.

## 6. Fase 3 — Cierre de brechas (archivos exactos, en este orden)

### 6.1 `package.json` — agregar 4 scripts (modificar)

```json
"seed:local": "node --experimental-strip-types --import ./scripts/ts-path-loader.mjs scripts/seed-local.ts",
"verify:bundle": "node scripts/verify-bundle.mjs",
"verify:surface": "node scripts/verify-surface.mjs",
"verify:console": "node scripts/verify-console.mjs"
```

Sin dependencias nuevas. Verificación: `npm run seed:local` contra Mongo local corre e imprime `[seed:local] Listo.`

### 6.2 `scripts/seed-local.ts` — corregir comentario de cabecera (modificar)

Reemplazar la línea de uso por:

```text
//   npm run seed:local
//   (equivalente: node --experimental-strip-types --import ./scripts/ts-path-loader.mjs scripts/seed-local.ts)
```

### 6.3 `docs/runbook-produccion.md` — sección nueva (modificar)

Agregar sección **"11. Datos de ejemplo (seed local)"** documentando: propósito (solo desarrollo), prerequisito (`docker compose up -d mongo`), comando `npm run seed:local`, qué crea (18 categorías, 10 transacciones, usuario `prueba@cashinsight.app` con perfil y meta de emergencia), idempotencia, guard anti-remota (aborta si `MONGODB_URI` no es localhost salvo `SEED_ALLOW_REMOTE=1`), y advertencia explícita: **nunca contra Atlas salvo migración deliberada**; `/api/seed` ya no existe como ruta HTTP.

### 6.4 `scripts/verify-bundle.mjs` — dos correcciones (modificar)

- Cambiar la condición del bloque de rutas extendidas de `if (serverStarted && TEST_EMAIL && TEST_PASSWORD)` a `if (TEST_EMAIL && TEST_PASSWORD)`, y **aplicar `DASHBOARD_BUDGET`** (con `routeException()`) a `/control`, `/metas`, `/perfil`, `/report`, `/help`, `/onboarding` igual que a `/`.
- Reemplazar los samples hardcodeados de source maps por muestreo real: leer `.next/static/chunks/*.js`, tomar el runtime de Turbopack + los 2 chunks más grandes, y pedir `/_next/static/chunks/<file>.map` exigiendo ≠200.

### 6.5 `src/test/next-config.test.ts` — test nuevo (crear)

3 asserts: `poweredByHeader === false`; `output` es `'standalone'` sin `VERCEL` y `undefined` con `VERCEL=1` (evaluar la expresión de config); `headers()` incluye los 2 headers de `/sw.js`. Importa `next.config.ts` directamente (solo usa `import type`, sin efectos).

**NO tocar:** `src/lib/seed.ts`, `src/app/api/**`, `src/proxy.ts`, `public/sw.js` (salvo que un gate lo exija), `next.config.ts`.

## 7. Estrategia de consola real (ya implementada — verificar, no rehacer)

`scripts/verify-console.mjs`: Chrome headless del sistema vía **CDP directo** (WebSocket global de Node 22 → sin Puppeteer/Playwright). Cubre: `/login` y `/register` públicas; redirección protectora de `/`, `/control`, `/metas`, `/perfil`, `/report`, `/help`, `/onboarding` sin sesión; 404 en ruta inexistente; login con password incorrecta (error visible en `#auth-error`, request 401 en allowlist); login correcto; modales (nuevo movimiento, nuevo límite, aporte real, nueva meta, retiro); `/perfil`, `/report`; logout. Limpieza: perfil Chrome descartable en `evidencia/` (gitignored), eventos drenados por paso, colección `ratelimits` limpiada en la DB dedicada `cashinsightapp_console`. Errores esperables (401 de login, favicon, 404 transitorio de payloads RSC `?_rsc=`) separados por allowlist; cualquier `console.error`/`exceptionThrown` restante = FAIL.

**Logging server-side (revisar, no borrar):** `grep -rn "console\." src/app/api src/lib` — los `console.error` de API son diagnóstico útil y se mantienen; `forgot/route.ts` imprime el token de recuperación *a propósito* (diseño documentado en deploy spec §10.4: token solo en logs de función, nunca al cliente). Confirmar que ninguno imprime passwords ni `MONGODB_URI`. Cliente: solo `src/app/control/page.tsx:68` loguea en un catch de borrado (ruta de error, no flujo normal) — aceptable.

## 8. Fase 4 — Gates completos y evidencia (orden fijo)

```bash
npm run test && npm run test:coverage && npx tsc --noEmit && npm run lint
npm run build                       # verde + .next/standalone existe (Docker)
VERCEL=1 npm run build              # verde; verificar que NO genera standalone
npm run build                       # re-generar standalone para los verificadores
npm audit --audit-level=high        # 0
# servidor standalone en :3100 + DB cashinsightapp_console (como Fase 2)
npm run verify:bundle               # PASS (con enforcement nuevo de rutas dashboard)
npm run verify:surface              # PASS
npm run verify:console              # PASS (20 pasos)
```

Evidencia en `evidencia/hardening-runtime-predeploy/` (gitignored): refrescar `20-bundle-report.*`, `30-surface-report.log`, `40-console-report.*`, `50-gates-*.log` y **`00-reporte-final.md`** con las medidas finales (incluyendo los JS iniciales de las 6 rutas dashboard extendidas) y los comandos exactos.

## 9. Rollback

- **Cualquier edición de Fase 3 rompe un gate:** `git checkout -- <archivo>` (tracked) o borrar el archivo nuevo; restaurar estado completo con `git apply -R backups/hardening-pre-plan.patch` según `backups/hardening-pre-plan.status`.
- **`scripts/verify-pwa.mjs` o consola fallan por el fix de `public/sw.js`:** NO revertir a ciegas (la versión anterior tiene el bug de navegación con redirect cacheado). STOP y escalar al usuario.
- **Rollback total del hardening (última instancia):** `git checkout HEAD -- .` restaura incluso `/api/seed`; reabre los 4 hallazgos → solo con confirmación explícita del usuario.

## 10. Commit y post-deploy

- **Commit único** (previa confirmación del usuario, regla del repo): `feat: hardening runtime pre-deploy — headers, seed local, consola y budgets de bundle`, incluyendo la eliminación de `src/app/api/seed/route.ts` (`git add -A` sobre los paths tocados). Verificar `git status` sin secretos en el diff.
- **Post-deploy Vercel** (tras ejecutar `specs/deploy-vercel-atlas.md`): `BASE_URL=https://<app>.vercel.app npm run verify:surface` (sin credenciales → valida headers, `/api/seed` ausente, redirects, source maps 404, robots/sitemap) + `node scripts/verify-pwa.mjs https://<app>.vercel.app`. Evidencia en `evidencia/hardening-runtime-predeploy/60-vercel-*.log`.

## 11. Riesgos a vigilar

- Los nombres de chunks cambian entre builds → por eso 6.4 deriva los samples de source maps de archivos reales.
- `metas-aporte` escribe un aporte real en la DB de verificación (descartable) — re-seed si se necesita estado limpio.
- El enforcement nuevo de rutas dashboard (6.4) puede revelar que alguna ruta supera 250 KB gzip → resolver con `next/dynamic` (patrón ya usado en `/`) o excepción documentada en `scripts/bundle-budget-exceptions.json`; **no** relajar el budget sin documentar.

## 12. Out of scope

Sentry/monitoring, reescritura del dashboard, rate limiting nuevo (ya existe en `src/lib/rate-limit.ts`), cambios de auth, multi-usuario — según spec §10.
