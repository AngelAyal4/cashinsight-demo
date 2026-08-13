# Ejecutor — Deploy Vercel + Atlas M0 (producción definitiva)

Rol: **ejecutor**. Implementás los cambios de código y documentación del plan aprobado. NO creás ni configurás recursos en cuentas externas (cluster Atlas, proyecto Vercel, env vars en el panel) — eso lo hace el usuario siguiendo el runbook; tu entregable es el código listo para ese deploy.

## Tu tarea

1. Leé `AGENTS.md`, la spec `specs/deploy-vercel-atlas.md` y el plan `prompts/03-plan-vercel-atlas.md`.
2. Corré las **verificaciones previas** del plan (gates baseline: `npm run test`, `npm run lint`, `npm run build` — deben estar verdes antes de tocar nada).
3. Implementá los cambios de la spec sección 4, en el orden del plan:
   - `next.config.ts`: `output: process.env.VERCEL ? undefined : 'standalone'`. Verificá AMBOS caminos: `VERCEL=1 npm run build` compila sin standalone (simula Vercel) y `npm run build` normal sigue generando `.next/standalone` (Docker intacto).
   - `src/lib/rate-limit.ts`: ventana fija por IP, colección `ratelimits` con TTL index, upsert atómico, `429` genérico. Integrá en login/register/forgot/reset (POST). Sin dependencias npm nuevas.
   - Tests de rate limit en `src/test/` (o el patrón que use el proyecto): 11 intentos → 429, ventana distinta no bloquea, rutas privadas no afectadas.
   - `.env.example`: documentar `MONGODB_URI` + `JWT_SECRET` requeridos en producción (placeholders, NUNCA valores reales).
   - `scripts/backup.sh`: `mongodump --uri "$MONGODB_URI"` contra Atlas, gzip con fecha, retención 14 días, salida legible. La URI se lee desde `.env` local (nunca versionado).
   - `docs/runbook-produccion.md`: sección "Deploy Vercel + Atlas" con pasos exactos para el usuario: crear cluster Atlas M0, usuario con rol `readWriteAnyDatabase`, IP access list `0.0.0.0/0`, importar repo en Vercel, setear env vars `MONGODB_URI` + `JWT_SECRET` (generado con `openssl rand -base64 32`, sin imprimirlo), migración local→Atlas (mongodump local → mongorestore a Atlas), dónde ver el token de recuperación (logs de función), backup/restore contra Atlas.
4. Corré los **gates completos** sobre el árbol final: `npm run test`, `npm run lint`, `npm run build` + `git diff --check`. Todo debe quedar verde con evidencia real.
5. NO commitees: el review lo hace otro agente (Hermes) antes del commit.

## Reglas

- TypeScript strict, sin `any`; Zod en las rutas que toques; errores al usuario siempre genéricos.
- No tocar `.env*`, `AGENTS.md`, ni la constitution.
- No modificar nada fuera del alcance de la spec (no refactors colaterales).
- Sin dependencias npm nuevas.
- Guardá evidencia de cada gate en el reporte final (conteos reales, no descripciones).
