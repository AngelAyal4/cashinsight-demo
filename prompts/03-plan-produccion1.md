# PLAN — Fase Producción 1: prueba local compartida (Cloudflare Quick Tunnel)

> Orquestador → Ejecutor. Fecha: 2026-08-10.
> Prohibido tocar: `AGENTS.md`, `.env` (dev), `constitution.md`. Sin librerías npm nuevas.

## Contexto verificado (baseline)

- Docker OK; `cashinsight-mongo` (mongo:7) up; volumen real `cashinsight-app_mongo_data` montado en `/data/db` (spec dice "mongo_data" = nombre con prefijo de proyecto). Compose v5.1.3.
- Baseline datos (users/transactions/categories/budgets/savingsgoals): **`{"users":1,"transactions":13,"categories":17,"budgets":3,"savingsgoals":3}`** (re-verificar ANTES y DESPUÉS).
- `.gitignore:18` cubre `.env.production` (verificado `git check-ignore -v`). `.npmrc` = `legacy-peer-deps=true`. `package-lock.json` existe.
- No hay middleware → `/manifest.webmanifest`, `/sw.js`, `/login` públicos. Manifest es ruta de app (`src/app/manifest.ts`), NO archivo en `public/` (standalone lo sirve solo). `sw.js` + íconos vienen de `public/`.
- No se usa `next/image` → standalone sin `sharp`.
- Host NO tiene mongodump/mongosh → `backup.sh` ejecuta mongodump DENTRO del contenedor vía `docker exec` (URI `mongodb://127.0.0.1:27017/cashinsightapp` se mantiene, 127.0.0.1 = dentro del contenedor mongo).
- Host tiene `google-chrome` + Node 22 → PWA por CDP con WebSocket nativo (cero deps npm).
- Puerto 3000 libre; árbol git limpio; `prompts/03-plan-produccion1.md` no pisa nada.
- Credencial demo ya consta en `prompts/02-ejecutor-produccion.md:19` (trackeado) → referenciar por puntero, NO copiar el valor a archivos nuevos ni echoarlo en logs.
- Discrepancia spec: §2 dice `node:22-slim`, §3 dice `node:22-alpine`. Decisión: **alpine** (§3, operativa). Sin deps nativas (bcryptjs/jsonwebtoken/mongoose = JS puro; no hay `next/image`). Fallback: si `npm ci` falla por musl, cambiar a `node:22-slim`.
- API login: `POST /api/auth/login` `{email,password}` → cookie `auth_token` (secure en prod).
- API transacciones expense: `POST /api/transactions` `{type:"expense", amount, description, category(24-hex), paidBy?}`. Id de categoría mongosh: `db.getSiblingDB("cashinsightapp").categories.findOne({type:"expense"})._id.toString()`.

## Decisiones del orquestador (no volver a consultar)

1. Alpine sobre slim (nota de riesgo documentada).
2. Backup vía `docker exec` por ausencia de mongodump en host.
3. `.dockerignore` + `.gitignore` (`backups/`, `evidencia/`) como adiciones mínimas justificadas (secreto en imagen / dumps trackeados romperían criterio 9).
4. Credencial demo por puntero a `prompts/02-ejecutor-produccion.md:19`, sin duplicar.
5. Remoción de `version: "3.8"` (obsoleto en Compose v5; 1 línea).

---

## Paso 1 — Verificaciones previas

```bash
docker info >/dev/null && echo OK
docker ps --filter name=cashinsight-mongo --format '{{.Names}} {{.Status}}'
docker volume ls | grep cashinsight-app_mongo_data
cat .npmrc
git check-ignore -v .env.production
test -f package-lock.json && echo OK
ss -tln | grep -E ':3000\s' || echo "3000 libre"
git status --porcelain
command -v google-chrome openssl node
mkdir -p evidencia/produccion-1
```

Captura baseline:

```bash
docker exec cashinsight-mongo mongosh --quiet --eval 'const db=db.getSiblingDB("cashinsightapp"); print(JSON.stringify({users:db.users.countDocuments(),transactions:db.transactions.countDocuments(),categories:db.categories.countDocuments(),budgets:db.budgets.countDocuments(),savingsgoals:db.savingsgoals.countDocuments()}))' | tee evidencia/produccion-1/baseline-counts.json
```

## Paso 2 — Cambios de código/infra (orden spec §3)

**2.1 `next.config.ts`** — agregar `output: 'standalone'`:

```ts
const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};
```

**2.2 `Dockerfile`** (raíz, nuevo):

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**2.2b `.dockerignore`** (nuevo — evita `.env`/`.next`/`node_modules` en capas de imagen):

```
node_modules
.next
.git
.env*
coverage
backups
evidencia
prompts
specs
docs
memory
*.log
tsconfig.tsbuildinfo
```

**2.3 `docker-compose.yml`** (contenido final completo; quitar `version: "3.8"`):

```yaml
services:
  mongo:
    image: mongo:7
    container_name: cashinsight-mongo
    ports:
      - "127.0.0.1:27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: cashinsightapp
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand({ ping: 1 })"]
      interval: 5s
      timeout: 5s
      retries: 12
      start_period: 10s
    restart: unless-stopped

  app:
    build: .
    container_name: cashinsight-app
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    depends_on:
      mongo:
        condition: service_healthy
    restart: unless-stopped

  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: cashinsight-tunnel
    command: tunnel --no-autoupdate --url http://app:3000
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo_data:
```

**2.4 `.env.production`** (nuevo, NO versionar, NO mostrar valor):

```bash
{ echo 'MONGODB_URI=mongodb://mongo:27017/cashinsightapp'; printf 'JWT_SECRET=%s\n' "$(openssl rand -base64 32)"; } > .env.production
chmod 600 .env.production
git check-ignore -v .env.production
test -s .env.production && echo OK
```

**2.5 `.env.example`** — agregar:

```
# Produccion (Docker): copiar a .env.production (gitignored) con
# MONGODB_URI=mongodb://mongo:27017/cashinsightapp y JWT_SECRET=$(openssl rand -base64 32)
```

**2.6 `scripts/backup.sh`** (nuevo, `chmod +x`). mongodump DENTRO del contenedor; nombre fecha-hora:

```bash
#!/usr/bin/env bash
set -euo pipefail
CONTAINER="${MONGO_CONTAINER:-cashinsight-mongo}"
DB_URI="mongodb://127.0.0.1:27017/cashinsightapp"
BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups"
RETENTION_DAYS=14
FILE="$BACKUP_DIR/cashinsight-$(date +%Y%m%d-%H%M%S).gz"
mkdir -p "$BACKUP_DIR"
docker ps --format '{{.Names}}' | grep -qx "$CONTAINER" || { echo "ERROR: $CONTAINER no corre" >&2; exit 1; }
echo "→ Backup → $FILE"
docker exec "$CONTAINER" mongodump --uri "$DB_URI" --archive | gzip > "$FILE"
[[ -s "$FILE" ]] || { echo "ERROR: backup vacio" >&2; rm -f "$FILE"; exit 1; }
echo "OK ($(du -h "$FILE" | cut -f1))"
find "$BACKUP_DIR" -name 'cashinsight-*.gz' -mtime +$RETENTION_DAYS -print -delete
echo "Retencion ${RETENTION_DAYS}d aplicada"
```

**2.7 `docs/runbook-produccion.md`** (nuevo). Secciones: ① arranque (`docker compose up -d --build`), ② leer URL pública (`docker compose logs tunnel 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1`), ③ rotar JWT_SECRET: editar `.env.production` → `docker compose up -d app` (RECREATE; `restart` NO relee env_file) → sesiones caen, ④ backup (`scripts/backup.sh`) y restore (`gunzip -c backups/<f>.gz | docker exec -i cashinsight-mongo mongorestore --uri mongodb://127.0.0.1:27017 --archive --drop`, DESTRUCTIVO, con advertencia), ⑤ apagado (`docker compose down`; NUNCA `down -v`; `docker compose stop tunnel` para cerrar exposición), ⑥ paso a dominio: `cloudflared tunnel login` → `cloudflared tunnel create` → DNS CNAME → cambiar solo `command` del servicio `tunnel` a `tunnel --no-autoupdate run <nombre>` + montar `~/.cloudflared`, ⑦ paso a VPS: mismo compose + repo + `.env.production`; mongo con auth (fase 2).

**2.8 `.gitignore`** — agregar:

```
backups/
evidencia/
```

## Paso 3 — Arranque

```bash
docker compose up -d --build        # 1ª build: varios minutos (npm ci + next build); NO interrumpir
docker compose ps | tee evidencia/produccion-1/01-compose-ps.log
docker compose logs tunnel 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1 | tee evidencia/produccion-1/tunnel-url.txt
TUNNEL=$(cat evidencia/produccion-1/tunnel-url.txt)
```

## Paso 4 — Verificación criterios (spec §5) con evidencia

| # | Comando | Esperado | Evidencia |
|---|---|---|---|
| 1 | `docker compose ps` | mongo `Up (healthy)`, app/tunnel `Up` | `01-compose-ps.log` |
| 2 | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login` + `ss -tln \| grep :3000` | `200`; listener docker-proxy | `02-curl-localhost.log` |
| 3 | Login local y público (PASS por puntero, no echo) | `{"user":…}` + API sirve con cookie | `03-login-local.log`, `03-login-public.log` |
| 4 | Re-correr query baseline | idéntico a `baseline-counts.json` | `04-post-counts.json` |
| 5 | `curl -sI "$TUNNEL/login"` + `curl -v "$TUNNEL" 2>&1 \| grep -E 'SSL\|issuer:'` | `HTTP/2 200`, TLS válido | `05-https-public.log` |
| 6 | curls + `node scripts/verify-pwa.mjs "$TUNNEL"` | manifest 200 JSON, sw.js 200 no-cache, `state:"activated"` | `06-pwa-verify.log` |
| 7 | Flujo gasto remoto | 201 → visible localhost → persiste tras `docker compose restart app` | `07-gasto-remoto.log` |
| 8 | `scripts/backup.sh` + restore contenedor descartable | `.gz` no vacío; conteos restaurados = baseline | `08-backup-restore.log` |
| 9 | `git status --porcelain`; `git check-ignore -v .env.production backups evidencia` | sin secretos; los 3 ignorados | `09-git-status.log` |
| 10 | Checklist secciones runbook ①–⑦ | todas presentes | `10-runbook-check.log` |

**Criterio 3** (PASS por puntero; NO copiar/echo):

```bash
PASS=$(grep -oP 'prueba@cashinsight\.app` / `\K[^`]+' prompts/02-ejecutor-produccion.md | head -1)
curl -s -c /tmp/cj-local -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"prueba@cashinsight.app\",\"password\":\"$PASS\"}" | tee evidencia/produccion-1/03-login-local.log
curl -s -b /tmp/cj-local 'http://localhost:3000/api/transactions?limit=1' | tee -a evidencia/produccion-1/03-login-local.log
# Idem contra "$TUNNEL" con jar /tmp/cj-public → 03-login-public.log
```

**Criterio 6** — previo curls: `curl -sI "$TUNNEL/manifest.webmanifest"` (200) y `curl -sI "$TUNNEL/sw.js"` (200 + `Cache-Control: no-cache…`). Luego `scripts/verify-pwa.mjs` (Node ≥22 WebSocket nativo; SW se registra desde layout → probar `/login`):

```js
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const target = process.argv[2];
if (!target) { console.error('Uso: node scripts/verify-pwa.mjs <URL_PUBLICA>'); process.exit(2); }
const CHROME = process.env.CHROME_BIN || 'google-chrome';
const PORT = 9222, page = new URL('/login', target).href;
const profile = mkdtempSync(join(tmpdir(), 'pwa-verify-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-sandbox',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=${profile}`,'about:blank'], { stdio: 'ignore' });

let ws, msgId = 0; const pending = new Map();
const send = (method, params = {}, sessionId) => {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};

async function main() {
  let wsUrl;
  for (let i = 0; i < 40; i++) {
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl; break; }
    catch { await sleep(500); }
  }
  if (!wsUrl) throw new Error('Chrome DevTools no respondio');
  ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (e) => { const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } };

  const { targetId } = await send('Target.createTarget', { url: page });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const expression = `navigator.serviceWorker.ready.then((r) => ({ state: r.active && r.active.state,
    scope: r.scope, manifestLink: !!document.querySelector('link[rel="manifest"]') }))`;
  let result; const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const ev = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    result = ev.result.value;
    if (result && result.state === 'activated') break;
    await sleep(1000);
  }
  const ok = result && result.state === 'activated' && result.manifestLink;
  console.log(JSON.stringify({ page, ok, ...result }, null, 2));
  process.exitCode = ok ? 0 : 1;
}
main().catch((e) => { console.error('ERROR:', e.message); process.exitCode = 1; })
  .finally(() => { try { ws?.close(); } catch {} chrome.kill('SIGKILL'); rmSync(profile, { recursive: true, force: true }); });
```

**Criterio 7**:

```bash
CAT=$(docker exec cashinsight-mongo mongosh --quiet --eval 'print(db.getSiblingDB("cashinsightapp").categories.findOne({type:"expense"})._id.toString())')
curl -s -b /tmp/cj-public -X POST "$TUNNEL/api/transactions" -H 'Content-Type: application/json' -d "{\"type\":\"expense\",\"amount\":1,\"description\":\"test-remoto-prod1\",\"category\":\"$CAT\",\"paidBy\":\"yo\"}"   # 201
curl -s -b /tmp/cj-local 'http://localhost:3000/api/transactions?limit=5' | grep -c test-remoto-prod1   # >=1
docker compose restart app && sleep 5
curl -s -b /tmp/cj-local 'http://localhost:3000/api/transactions?limit=5' | grep -c test-remoto-prod1   # sigue >=1
# Limpieza opcional: DELETE /api/transactions/<id> si existe; si no, mongosh deleteOne por description
```

**Criterio 8**:

```bash
scripts/backup.sh | tee evidencia/produccion-1/08-backup-restore.log
test -s backups/cashinsight-*.gz && echo OK
docker run -d --rm --name mongo-restore-test -p 127.0.0.1:27018:27017 mongo:7 && sleep 8
gunzip -c backups/<ultimo>.gz | docker exec -i mongo-restore-test mongorestore --archive --drop
docker exec mongo-restore-test mongosh --quiet --eval '<misma query conteos>'   # = baseline
docker stop mongo-restore-test   # --rm lo elimina
```

## Riesgos a vigilar (spec §6 + hallazgos)

- R1 URL efímera: cambia en cada recreate de `tunnel` → releer `tunnel-url.txt`.
- R2 Cuenta única sin rate limiting: aceptado; runbook documenta `docker compose stop tunnel` y rotación post-demo.
- R3 Mongo sin auth: tras cambio, `ss -tln | grep 27017` → SOLO `127.0.0.1:27017`; túnel apunta a app:3000, nunca mongo.
- R4 Recreación mongo al cambiar ports: volumen sobrevive; NUNCA `down -v`; comparar conteos criterio 4.
- R5 Standalone PWA: sw.js de public/ copiado al runner; manifest es ruta de app servida por standalone → ambos con curl criterio 6.
- R6 Discrepancia slim vs alpine: se adopta alpine (§3). Sin deps nativas. Si npm ci falla por musl (no esperado), 3 stages → node:22-slim.
- R7 Primera build larga (npm ci + next build en Docker): no interrumpir.
- R8 `restart` no relee env_file: para rotar JWT recrear con `up -d app` (documentado en runbook). Criterio 7 usa restart sin cambio de env → OK.
- R9 Quick tunnel requiere salida a internet.
- R10 Cookie secure en http://localhost: curl la guarda igual; Chrome/Firefox aceptan Secure en localhost → login local OK.
- R11 Tokens de recuperación en logs del contenedor app → evidencia en `evidencia/` (gitignored).

## Dónde guardar evidencia

Todo en `evidencia/produccion-1/` (gitignored, paso 2.8), salidas reales vía `| tee`. Archivos: `01-compose-ps.log`, `02-curl-localhost.log`, `03-login-local.log`, `03-login-public.log`, `04-post-counts.json`, `05-https-public.log`, `06-pwa-verify.log`, `07-gasto-remoto.log`, `08-backup-restore.log`, `09-git-status.log`, `10-runbook-check.log`, `baseline-counts.json`, `tunnel-url.txt`. Los logs capturan SALIDAS, nunca `$PASS` ni `JWT_SECRET`.
