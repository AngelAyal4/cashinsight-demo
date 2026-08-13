# Runbook — Producción 1 (CashinsightApp)

> Docker Compose (app Next standalone + Mongo 7) + Cloudflare Quick Tunnel.
> **Plan B (VPS)** y referencia de backup/restore — la producción definitiva es **Vercel + Atlas M0** (ver §10).
> Ejecutar los comandos desde la raíz del repo.

## 1. Arranque

```bash
docker compose up -d --build
```

La primera build tarda varios minutos (`npm ci` + `next build` dentro del contenedor). No interrumpir.

## 2. Leer la URL pública

```bash
docker compose logs tunnel 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1
```

La URL es efímera: cambia en cada recreación del servicio `tunnel`. Si se pierde, releer con el comando anterior.

Local sigue disponible en `http://localhost:3000`.

## 3. Logs

```bash
docker compose logs -f app        # app Next (aquí se imprimen los tokens de recuperación)
docker compose logs -f tunnel     # túnel Cloudflare
docker compose logs -f mongo      # base de datos
```

## 4. Reiniciar / apagar

```bash
docker compose restart app         # reinicia la app (NO relee env_file, solo procesos)
docker compose stop tunnel         # cierra la exposición a internet
docker compose up -d tunnel         # reabrir exposición
docker compose down                # apagar todo
```

**NUNCA** `docker compose down -v` (borraría el volumen `mongo_data` y todos los datos).

## 5. Rotar JWT_SECRET

1. Editar `.env.production` y cambiar `JWT_SECRET`.
2. Recrear el contenedor:

```bash
docker compose up -d app
```

> ⚠️ `docker compose restart` **NO** relee `env_file`; para aplicar un nuevo JWT_SECRET hay que recrear con `up -d`.
3. Todas las sesiones existentes caducan → los usuarios deben re-login (comportamiento esperado).

## 6. Backup

```bash
./scripts/backup.sh
```

Guarda `backups/cashinsight-YYYYMMDD-HHMMSS.gz` y purga los de más de 14 días. Usa `mongodump` ejecutado dentro del contenedor `cashinsight-mongo` (el host no requiere mongodb-database-tools).

## 7. Restore

> ⚠️ DESTRUCTIVO: reemplaza la base actual por el contenido del dump.

```bash
gunzip -c backups/<archivo>.gz | docker exec -i cashinsight-mongo mongorestore --uri mongodb://127.0.0.1:27017 --archive --drop
```

Para probar un restore sin riesgo, usar un contenedor descartable:

```bash
docker run -d --rm --name mongo-restore-test -p 127.0.0.1:27018:27017 mongo:7
sleep 8
gunzip -c backups/<archivo>.gz | docker exec -i mongo-restore-test mongorestore --archive --drop
docker exec mongo-restore-test mongosh --quiet --eval '<query de verificacion>'
docker stop mongo-restore-test    # --rm lo elimina
```

## 8. Paso a dominio propio (túnel nombrado)

El compose de producción es la misma pieza que se lleva al VPS. Para dominio:

```bash
cloudflared tunnel login
cloudflared tunnel create cashinsight
# Anotar el UUID del túnel y el path de credenciales (~/.cloudflared/<uuid>.json)
# En Cloudflare DNS: CNAME que apunte al túnel (<uuid>.cfargotunnel.com)
```

Cambiar solo el `command` del servicio `tunnel` en `docker-compose.yml`:

```yaml
tunnel:
  image: cloudflare/cloudflared:latest
  container_name: cashinsight-tunnel
  command: tunnel --no-autoupdate run cashinsight
  volumes:
    - ~/.cloudflared:/root/.cloudflared
  depends_on:
    - app
  restart: unless-stopped
```

La URL deja de ser efímera y pasa a ser la del dominio propio.

## 9. Paso a VPS

1. Clonar repo + copiar `.env.production` (gitignored) al VPS.
2. `docker compose up -d --build` (mismo compose).
3. **Fase 2**: Mongo con auth por variables de entorno (fuera de scope actual).

## 10. Deploy Vercel + Atlas (producción definitiva)

> Next.js fullstack (API routes en el mismo repo) en Vercel Hobby ($0) + MongoDB Atlas M0 free (512MB).
> Pasos para el **usuario**: crear los recursos en Atlas y Vercel; el repo ya está listo para este deploy.

### 10.1 Crear el cluster Atlas

1. Ir a https://cloud.mongodb.com → New Project → Create Cluster → plan **M0** (free forever, 512MB), nombre del cluster: `cashinsight`.
2. **Database Access → Add New Database User**:
   - Auth Method: Password (generar con `openssl rand -base64 24`).
   - Role: **readWriteAnyDatabase** (NUNCA admin).
3. **Network Access → Add IP Address**: permitir `0.0.0.0/0` (Vercel serverless no tiene IP fija; mitigado con password fuerte + rate limiting en auth).
4. Copiar la connection string `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/` — quedará en el panel de Vercel, **nunca** en el repo.

### 10.2 Importar en Vercel y setear env vars

1. Vercel → Add New Project → Import del repo GitHub. Framework Next.js auto-detectado. **Sin `vercel.json`** (no hace falta).
2. **Project Settings → Environment Variables**:
   - `MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/cashinsightapp` (requerida).
   - `JWT_SECRET` (requerida, **nueva**, distinta de la de dev): generar con `openssl rand -base64 32` y pegar el resultado directo en el panel, **sin imprimirlo** en logs/chat.
3. Deploy. La app queda en `https://<proyecto>.vercel.app`.

### 10.3 Migrar los datos locales → Atlas

El host no tiene `mongodump`/`mongorestore`; se ejecutan dentro del contenedor `cashinsight-mongo`:

```bash
# 1. Dump del mongo local (respaldo ANTES del restore)
docker exec cashinsight-mongo mongodump --uri mongodb://127.0.0.1:27017/cashinsightapp --archive | gzip > backups/local-pre-vercel.gz
# 2. Restore a Atlas (una vez creado el cluster y la URI)
gunzip -c backups/local-pre-vercel.gz | docker exec -i cashinsight-mongo mongorestore --uri "<ATLAS_URI>" --archive --drop
```

> ⚠️ `--drop` es destructivo sobre Atlas, no sobre el local; el dump local queda como respaldo.

Verificar conteos (mismo comando con la URI local para comparar):

```bash
docker exec cashinsight-mongo mongosh "<URI>" --quiet --eval 'db.transactions.countDocuments({}); db.categories.countDocuments({}); db.savingsgoals.countDocuments({}); db.budgets.countDocuments({}); db.users.countDocuments({})'
```

### 10.4 Token de recuperación de contraseña

El token se imprime por `console.log` en los logs de la función serverless: dashboard Vercel → **Logs → Functions** (buscar `[RECUPERACIÓN]`). Mismo diseño que el contenedor local, distinta ventana.

### 10.5 Backup / restore contra Atlas

M0 **no tiene backups automáticos**: el backup manual es obligatorio (cron local o recordatorio).

```bash
# Backup (URI desde el entorno o ./.env local — nunca versionada; no se imprime)
MONGODB_URI="<ATLAS_URI>" ./scripts/backup.sh
# → backups/atlas-cashinsight-YYYYMMDD-HHMMSS.gz, retención 14 días
```

Restore a un contenedor descartable local (sin riesgo):

```bash
docker run -d --rm --name mongo-restore-test -p 127.0.0.1:27018:27017 mongo:7
sleep 8
gunzip -c backups/atlas-cashinsight-<archivo>.gz | docker exec -i mongo-restore-test mongorestore --archive --drop
docker exec mongo-restore-test mongosh --quiet --eval '<query de verificacion>'
docker stop mongo-restore-test    # --rm lo elimina
```

O a Atlas directamente (⚠️ destructivo): `gunzip -c backups/<archivo>.gz | docker exec -i cashinsight-mongo mongorestore --uri "<ATLAS_URI>" --archive --drop`.

### 10.6 Rate limiting en producción

Login/register/forgot/reset tienen ventana fija de 15 min por IP (colección `ratelimits` con TTL). Excedido → `429 "Demasiados intentos. Probá de nuevo más tarde."` Los límites del plan M0 cubren la escritura por intento (single-user).

### 10.7 Verificación post-deploy

Tras el deploy en Vercel, validar la superficie pública con los verificadores del hardening (sin credenciales):

```bash
BASE_URL=https://<proyecto>.vercel.app npm run verify:surface
node scripts/verify-pwa.mjs https://<proyecto>.vercel.app
```

## 11. Datos de ejemplo (seed local)

> Propósito: **solo desarrollo local**. Crea un usuario demo con datos de ejemplo para
> probar la app sin registrarse. Nunca debe ejecutarse contra Atlas.

### Prerequisito

MongoDB corriendo localmente:

```bash
docker compose up -d mongo
```

### Comando

```bash
npm run seed:local
```

Crea (de forma idempotente):

- **18 categorías** (fijas y variables, según `src/lib/default-categories.ts`).
- **10 transacciones** de ejemplo del mes en curso.
- Usuario **`prueba@cashinsight.app`** / `CashinsightDemo123!` con perfil financiero y
  meta de emergencia.

### Guardas

- **Idempotente:** si ya existe data de ejemplo, no la duplica (`[seed:local] Ya existe data`).
- **Anti-remota:** aborta si `MONGODB_URI` no apunta a localhost (`localhost`, `127.0.0.1`,
  `::1` o `*.local`), salvo que se fuerce con `SEED_ALLOW_REMOTE=1`.

> ⚠️ **NUNCA** ejecutar contra Atlas salvo una migración deliberada con
> `SEED_ALLOW_REMOTE=1`. El `/api/seed` HTTP ya **no existe** como ruta (fue eliminado del
> código y de los manifests del build); el seed vive solo en este CLI local.

## Seguridad

- Mongo solo alcanzable por red docker + `127.0.0.1:27017` (nunca vía túnel; el túnel expone solo `app:3000`).
- Cuenta única sin rate limiting (aceptado para demo): cerrar exposición con `docker compose stop tunnel` cuando no se use.
- Los tokens de recuperación de contraseña se imprimen en `docker compose logs -f app` (self-hosted sin SMTP, por diseño). No subir logs crudos a lugares públicos.
