# Orquestador — Deploy Vercel + Atlas M0 (producción definitiva)

Rol: **orquestador**. NO escribís código ni tocás archivos del proyecto: solo leés, analizás y producís un PLAN accionable. El plan lo ejecuta un agente ejecutor (`build`) posterior.

## Tu tarea

Leé `AGENTS.md` y la spec `specs/deploy-vercel-atlas.md`, más los archivos que necesites para fundamentar el plan (NUNCA `.env*`, `node_modules/`, `.next/`):

- `next.config.ts`, `docker-compose.yml`, `Dockerfile`, `.gitignore`, `.npmrc`, `package.json`, `src/lib/db.ts`, `src/proxy.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/register/route.ts`, `src/app/api/auth/forgot/route.ts`, `src/app/api/auth/reset/route.ts`, `scripts/backup.sh`, `docs/runbook-produccion.md`, `specs/produccion-local-compartida.md` (referencia del deploy anterior)

## Contexto ya verificado (no re-investigar, pero podés confirmar con lecturas)

- `db.ts` ya usa singleton con cache global (`global.mongoose`) — serverless-correcto, sin cambios.
- Sin `fs`/escritura a disco en `src/` — seguro en funciones efímeras.
- Rollover mensual lazy (primer request del mes, idempotente) — sin cron.
- `MONGODB_URI` env var con fallback localhost ya existe.
- Sin `NEXT_PUBLIC_*` en el código.
- Cookie de sesión ya `secure` en producción (funciona bajo HTTPS de Vercel).
- `.env`, `.env.production` ya cubiertos por `.gitignore`.

## Entregables del plan (markdown, pasos numerados)

1. **Verificaciones previas** que el ejecutor debe correr y su resultado esperado (repo limpio, gates verdes antes de tocar nada, `npm run build` local actual como baseline).
2. **Cambios de código/infra** en el orden de la spec sección 4:
   - `next.config.ts`: `output: process.env.VERCEL ? undefined : 'standalone'` (verificar que el Dockerfile local sigue generando standalone — criterio 6 de la spec).
   - Módulo `src/lib/rate-limit.ts` + integración en los 4 endpoints públicos de auth (login/register/forgot/reset): ventana fija 10 intentos / 15 min por IP (`x-forwarded-for`), colección `ratelimits` con TTL index, upsert atómico, respuesta `429` genérica. Sin dependencias npm nuevas.
   - Tests de rate limit (unit: 11 intentos → 429; ventana distinta no bloquea; rutas privadas no afectadas).
   - `.env.example`: documentar `MONGODB_URI` y `JWT_SECRET` requeridos en producción.
   - `scripts/backup.sh`: adaptar a `mongodump --uri "$MONGODB_URI"` contra Atlas + retención 14 días (leer URI desde `.env` local, nunca versionado).
   - `docs/runbook-produccion.md`: sección nueva "Deploy Vercel + Atlas" (crear cluster + usuario + IP access list, importar repo, env vars, migración local→Atlas, logs de token, backup/restore).
3. **Plan de deploy** exacto (sin ejecutar acciones en cuentas externas: el ejecutor prepara código y documentación; la creación de cluster Atlas / proyecto Vercel / env vars la hace el usuario con la guía del runbook) y **plan de verificación** de cada criterio de la spec sección 7, con evidencia reproducible (curl, mongosh, vercel CLI si está disponible).
4. **Riesgos a vigilar durante la ejecución** (sección 8 de la spec).
5. Indicar dónde guardar evidencia (logs de comandos reales, no descripciones).

## Reglas

- No modificar `AGENTS.md`, `.env*`, ni la constitution.
- No proponer features fuera de la spec (sin dominio, sin Sentry, sin multi-usuario en esta fase).
- El plan debe ser ejecutable de punta a punta por el ejecutor sin preguntar.
- Escribí el plan en `prompts/03-plan-vercel-atlas.md` (no pises archivos de orquestaciones previas).
