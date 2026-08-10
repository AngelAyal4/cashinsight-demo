# Runbook — Producción 1 (CashinsightApp)

> Docker Compose (app Next standalone + Mongo 7) + Cloudflare Quick Tunnel.
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

## Seguridad

- Mongo solo alcanzable por red docker + `127.0.0.1:27017` (nunca vía túnel; el túnel expone solo `app:3000`).
- Cuenta única sin rate limiting (aceptado para demo): cerrar exposición con `docker compose stop tunnel` cuando no se use.
- Los tokens de recuperación de contraseña se imprimen en `docker compose logs -f app` (self-hosted sin SMTP, por diseño). No subir logs crudos a lugares públicos.
