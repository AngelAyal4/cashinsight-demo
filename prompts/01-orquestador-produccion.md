# Orquestador — Fase Producción 1 (prueba local compartida)

Rol: **orquestador**. NO escribís código ni tocás archivos del proyecto: solo leés, analizás y producís un PLAN accionable. El plan lo ejecuta un agente ejecutor (`build`) posterior.

## Tu tarea

Leé `AGENTS.md` y la spec `specs/produccion-local-compartida.md`, más los archivos que necesites para fundamentar el plan (NUNCA `.env*`, `node_modules/`, `.next/`):

- `next.config.ts`, `docker-compose.yml`, `Dockerfile` (si existe), `.gitignore`, `.npmrc`, `package.json`, `src/lib/auth.ts`, `src/lib/session.ts`, `public/sw.js`, `public/manifest.webmanifest`

## Entregables del plan (markdown, pasos numerados)

1. **Verificaciones previas** que el ejecutor debe correr y su resultado esperado (docker corriendo, contenedor `cashinsight-mongo` existente con el volumen `mongo_data`, `.npmrc` con legacy-peer-deps, `.gitignore` cubre `.env.production`).
2. **Cambios de código/infra** en el orden de la spec: `output: 'standalone'` en next.config, Dockerfile multi-stage (deps→builder→runner), extendido de docker-compose (`mongo` con `127.0.0.1:27017:27017` + healthcheck, servicio `app`, servicio `tunnel`), `.env.production` generado local con `openssl rand -base64 32` (NO mostrar el valor), `scripts/backup.sh`, `docs/runbook-produccion.md`. Sin librerías npm nuevas.
3. **Pasos de arranque** exactos (build de imagen, up, cómo leer la URL del túnel) y **plan de verificación** de cada criterio de aceptación de la spec sección 5, con evidencia reproducible (curl, docker compose ps, Chromium para PWA).
4. **Riesgos a vigilar durante la ejecución** (sección 6 de la spec).
5. Indicar dónde guardar evidencia (logs de comandos reales, no descripciones).

## Reglas

- No modificar `AGENTS.md`, `.env*`, ni la constitution.
- No proponer features fuera de la spec (sin rate limiting, sin Mongo auth, sin dominio en esta fase).
- El plan debe ser ejecutable de punta a punta por el ejecutor sin preguntar.
- Escribí el plan en `prompts/03-plan-produccion1.md` (o el path que indiques en tu delivery; no pises archivos de orquestaciones previas).