import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const target = process.argv[2];
if (!target) {
  console.error('Uso: node scripts/verify-pwa.mjs <URL_PUBLICA>');
  process.exit(2);
}
const CHROME = process.env.CHROME_BIN || 'google-chrome';
const PORT = 9222;
const page = new URL('/login', target).href;
const profile = mkdtempSync(join(tmpdir(), 'pwa-verify-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' }
);

let ws;
let msgId = 0;
const pending = new Map();
const send = (method, params = {}, sessionId) => {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};

async function main() {
  let wsUrl;
  for (let i = 0; i < 40; i++) {
    try {
      wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json())
        .webSocketDebuggerUrl;
      break;
    } catch {
      await sleep(500);
    }
  }
  if (!wsUrl) throw new Error('Chrome DevTools no respondio en el puerto ' + PORT);

  ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) {
        p.reject(new Error(m.error.message));
      } else {
        p.resolve(m.result);
      }
    }
  };

  const { targetId } = await send('Target.createTarget', { url: page });
  const { sessionId } = await send('Target.attachToTarget', {
    targetId,
    flatten: true,
  });

  const expression = `navigator.serviceWorker.ready.then((r) => ({
    state: r.active && r.active.state,
    scope: r.scope,
    manifestLink: !!document.querySelector('link[rel="manifest"]'),
  }))`;

  let result;
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const ev = await send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
      sessionId
    );
    result = ev.result.value;
    if (result && result.state === 'activated') break;
    await sleep(1000);
  }

  const ok = Boolean(result && result.state === 'activated' && result.manifestLink);
  console.log(JSON.stringify({ page, ok, ...result }, null, 2));
  process.exitCode = ok ? 0 : 1;
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      ws?.close();
    } catch {}
    try {
      chrome.kill('SIGKILL');
    } catch {}
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {}
  });
