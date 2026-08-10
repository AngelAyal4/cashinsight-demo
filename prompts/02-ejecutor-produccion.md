# Ejecutor — Fase Producción 1 (prueba local compartida)

Rol: **ejecutor**. Ejecutás el PLAN del orquestador al pie de la letra. NO rediseñás, NO ampliás scope, NO tocás archivos fuera del plan. Si algo del plan choca con la realidad, lo reportás y seguís con lo demás (no te detenés a inventar).

## Tu tarea

Ejecutar el plan de la Fase Producción 1 según `specs/produccion-local-compartida.md` (leela completa primero). Resumen operativo:

1. Agregar `output: 'standalone'` a `next.config.ts` (mantener los headers de `/sw.js` intactos).
2. Crear `Dockerfile` multi-stage: `node:22-alpine` deps (`npm ci`, respeta `.npmrc` legacy-peer-deps) → builder (`next build`) → runner (`.next/standalone` + `.next/static` + `public`, `NODE_ENV=production`, `CMD ["node","server.js"]`).
3. Extender `docker-compose.yml`:
   - `mongo`: `127.0.0.1:27017:27017` + healthcheck (`mongosh --eval "db.runCommand({ping:1})"` o equivalente mongo:7)
   - `app`: build `.`, `3000:3000`, `env_file: .env.production`, depends_on mongo healthy, restart unless-stopped
   - `tunnel`: `cloudflare/cloudflared:latest`, `command: tunnel --no-autoupdate --url http://app:3000`, depends_on app, restart unless-stopped
4. Generar `.env.production` gitignored: `MONGODB_URI=mongodb://mongo:27017/cashinsightapp` + `JWT_SECRET=$(openssl rand -base64 32)`. Verificar que `.gitignore` lo cubre; verificar que JAMÁS se imprime el valor.
5. Crear `scripts/backup.sh` (mongodump a backups/ con fecha, retención 14 días) y `docs/runbook-produccion.md` (arranque, URL del túnel, rotación de JWT, restore, paso a dominio).
6. Arrancar `docker compose up -d --build` y verificar TODOS los criterios de la spec §5 con evidencia real:
   - `docker compose ps` (3 servicios)
   - curl localhost 200 + login real con `prueba@cashinsight.app` / `cashinsight2026` (la contraseña es de prueba; NO la commitees)
   - datos intactos (contar transacciones/categorías en la DB del volumen)
   - URL pública del túnel: HTTPS válido + manifest + SW activado (Chromium headless o curl de los assets)
   - persistencia tras `docker compose restart app`
   - backup genera .gz no vacío y restore probado
   - `git status` sin secretos
7. Gates del proyecto DESPUÉS de los cambios de código: `npm run test` (201 tests), `npx tsc --noEmit`, `npm run lint`, `npm run build` (debe seguir verde con standalone), `npm audit` sin high+.

## Reglas

- NUNCA imprimas ni commitees el JWT_SECRET ni ningún `.env*`.
- NUNCA `docker compose down -v` (borraría datos).
- No toques `AGENTS.md`, constitution, ni specs.
- Reporte final: lista de archivos tocados, evidencia real de cada criterio (salida de comandos, URLs, healthchecks), y cualquier desviación del plan con su motivo.