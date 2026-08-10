# Spec — Fase Producción 1: Prueba local compartida vía Cloudflare Tunnel

> Fecha: 2026-08-10 · Estado: para orquestador/ejecutor · Prioridad: alta
> Decisiones cerradas con el usuario: compartir desde casa ANTES que un VPS; **Quick Tunnel de Cloudflare** (URL efímera gratis, HTTPS automático, sin abrir puertos) mientras consigue dominio; después migrar a **túnel nombrado con dominio propio** (misma infra, costo ~0) y recién luego VPS.

## 1. Contexto y objetivo

CashinsightApp está lista (201 tests, producción build verde, PWA, recuperación, gastos de pareja). El objetivo es:

- **Levantar la app en modo producción real** desde la máquina del usuario (Docker Compose: app Next + Mongo 7).
- **Compartirla con conocidos por internet** con HTTPS válido (requisito de PWA y de cookies secure), **sin abrir puertos en el router** ni exponer la LAN: túnel outbound de Cloudflare.
- Que los datos actuales de dev (cuenta `prueba@cashinsight.app`, categorías, movimientos, metas, presupuestos) **sigan existiendo** — sin migrar ni perder nada.
- Dejar despejado el **camino a dominio propio + VPS**: el compose de producción es la misma pieza que se lleva al VPS.

Single-user por diseño (constitution 2.4): los conocidos comparten la cuenta única del sistema (login `prueba@cashinsight.app`).

## 2. Stack de deploy (sin dependencias npm nuevas)

| Pieza | Elección |
|---|---|
| App | Next.js 16 **standalone** (`output: 'standalone'` en next.config.ts) en imagen Docker multi-stage `node:22-slim` |
| DB | `mongo:7` — **el mismo volumen `mongo_data` ya existente** (los datos de dev se conservan tal cual, sin dump/restore) |
| Túnel | servicio `cloudflare/cloudflared` con quick tunnel → `https://xxxx.trycloudflare.com` (URL efímera visible en `docker compose logs tunnel`) |
| Orquestación | `docker compose` (extender el `docker-compose.yml` actual) |
| Env | `.env.production` gitignored: `JWT_SECRET` (generado con `openssl rand -base64 32`), `MONGODB_URI=mongodb://mongo:27017/cashinsightapp` |
| Backup | script `scripts/backup.sh` (mongodump → gzip con fecha, retención 14 días) + doc de restore |

## 3. Cambios de código/infra

1. **`next.config.ts`**: agregar `output: 'standalone'` (sin tocar los headers de `/sw.js`).
2. **`Dockerfile`** (nuevo, multi-stage):
   - `deps`: `node:22-alpine` + `npm ci` (respeta `.npmrc` con `legacy-peer-deps`)
   - `builder`: `next build`
   - `runner`: `node:22-alpine`, copiar `.next/standalone` + `.next/static` + `public`, `ENV NODE_ENV=production`, `EXPOSE 3000`, `CMD ["node", "server.js"]` (standalone, NO `next start`)
3. **`docker-compose.yml`** (extender):
   - `mongo`: cambiar `ports: 27017:27017` → `127.0.0.1:27017:27017` (dejar de exponer a la LAN; el host conserva acceso para mongosh y backups)
   - `app`: build local, `ports: 3000:3000`, `env_file: .env.production`, `depends_on: mongo` (condition healthy — agregar healthcheck a mongo), `restart: unless-stopped`
   - `tunnel`: `cloudflare/cloudflared:latest`, `command: tunnel --no-autoupdate --url http://app:3000`, `depends_on: app`, `restart: unless-stopped`
4. **`.env.production`** (nuevo, gitignored): `MONGODB_URI=mongodb://mongo:27017/cashinsightapp` + `JWT_SECRET=<openssl rand -base64 32>`. **No** versionar. Verificar que `.gitignore` cubre `.env.production` (pattern `.env*`).
5. **`.env.example`**: sumar comentario de producción (JWT_SECRET ya documentado).
6. **`scripts/backup.sh`** (nuevo): `mongodump --uri mongodb://127.0.0.1:27017/cashinsightapp --archive | gzip > backups/cashinsight-YYYYMMDD.gz` + limpieza de >14 días + salida legible.
7. **`docs/runbook-produccion.md`** (nuevo): comandos exactos de arranque, cómo leer la URL pública (`docker compose logs -f tunnel` | grep trycloudflare), cómo rotar JWT_SECRET, backup/restore, apagado (`docker compose down`), y **paso a dominio**: `cloudflared tunnel login` → named tunnel → DNS CNAME → cambiar solo el command del servicio tunnel.

## 4. Comportamiento esperado

- `docker compose up -d --build` levanta mongo (con datos actuales intactos), app y tunnel.
- `http://localhost:3000` sigue funcionando local; la **URL pública HTTPS** sirve la misma app (PWA instalable, login, notificaciones).
- La cookie de sesión ya es `secure` en production (src/lib/auth.ts:26) → funciona bajo HTTPS del túnel sin cambios.
- `/sw.js` usa rutas relativas (verificado) → el SW funciona bajo el dominio del túnel.
- Los datos viven en `mongo_data` (persisten ante `restart`; la recreación del contenedor mongo al cambiar el compose NO borra datos: volumen intacto).
- El token de recuperación de contraseña sigue imprimiéndose en la **consola del contenedor `app`** (`docker compose logs -f app`) — self-hosted sin SMTP, por diseño.

## 5. Criterios de aceptación (verificables, todos con evidencia)

1. `docker compose up -d --build` termina OK y `docker compose ps` muestra los 3 servicios `running` / healthy.
2. `curl http://localhost:3000/login` responde 200 con el build de producción (funciona sin `npm start` local).
3. Login real `prueba@cashinsight.app` funciona en localhost y en la URL pública (cookie secure bajo HTTPS).
4. Los datos previos están intactos (mismo conteo de transacciones/categorías que antes del deploy).
5. La URL pública (`*.trycloudflare.com`) carga la app con **HTTPS válido** (certificado de Cloudflare, sin advertencias).
6. **PWA instalable** desde la URL pública: `/manifest.webmanifest` responde, SW registrado y `state: activated` (verificado por Chromium headless).
7. Registro de un gasto desde internet se refleja en localhost y persiste tras `docker compose restart app` (misma DB).
8. `scripts/backup.sh` produce un `.gz` no vacío y `restore` documentado funciona (probado al menos una vez en contenedor descartable o contra un dump de prueba).
9. `git status` limpio de secretos: `.env.production` ignorado, ningún secreto en el diff.
10. Runbook documenta el paso rápido a dominio (túnel nombrado) y a VPS.

## 6. Riesgos y mitigaciones

- **URL efímera**: cada reinicio del servicio tunnel cambia la URL → avisar a conocidos; mitigación definitiva = dominio (paso C, documentado).
- **Exposición a internet de la cuenta única** (sin rate limiting): riesgo aceptado para demo; mitigaciones: contraseña fuerte rotada tras la demo, `docker compose stop tunnel` cuando no se use, sin datos sensibles reales.
- **Mongo sin auth**: solo alcanzable por red docker + 127.0.0.1 (nunca vía túnel). Si se despliega en VPS → Mongo con auth por env (fase 2).
- **`mongo` recreado al cambiar ports**: volumen `mongo_data` garantiza cero pérdida; verificar `docker compose up` no borre el volumen (nunca `down -v`).
- **Standalone**: verificar que `/manifest.webmanifest` y `/sw.js` queden servidos (public/ copiado al runner).

## 7. Fuera de scope (post-producción)

Dominio propio, VPS, rate limiting, autenticación en Mongo, multi-usuario, monitoreo/alertas, CI/CD.