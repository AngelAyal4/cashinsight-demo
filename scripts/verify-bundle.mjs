#!/usr/bin/env node
// Verificación reproducible del bundle de producción.
//
// Analiza el build en `.next` y, contra un servidor (reutiliza BASE_URL o
// levanta el standalone), mide el JS inicial por ruta, verifica los budgets,
// que `/api/seed` no esté registrado y que los source maps públicos no se
// entreguen.
//
// Uso:
//   node scripts/verify-bundle.mjs
//   BASE_URL=http://localhost:3100 TEST_EMAIL=x TEST_PASSWORD=y node scripts/verify-bundle.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(process.cwd());
const EVIDENCIA = path.join(ROOT, 'evidencia', 'hardening-runtime-predeploy');
const EXCEPTIONS_FILE = path.join(ROOT, 'scripts', 'bundle-budget-exceptions.json');
const CHUNKS_DIR = path.join(ROOT, '.next', 'static', 'chunks');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3199').replace(/\/$/, '');
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'bundle-verify-secret-2026';
const TEST_MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/cashinsightapp_console';

const AUTH_BUDGET = 150 * 1024;
const DASHBOARD_BUDGET = 250 * 1024;
const CHUNK_BUDGET = 100 * 1024;

const log = [];
const failures = [];
const passed = [];
const exceptions = JSON.parse(
  fs.existsSync(EXCEPTIONS_FILE)
    ? fs.readFileSync(EXCEPTIONS_FILE, 'utf8')
    : '[]'
);

function writeLine(line) {
  const text = typeof line === 'string' ? line : JSON.stringify(line);
  log.push(text);
  console.log(text);
}

function gzipSize(buffer) {
  return zlib.gzipSync(buffer).length;
}

function routeException(routePath) {
  return exceptions.find((entry) => entry.type === 'route' && entry.path === routePath);
}

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url + '/login', { redirect: 'manual' });
      if (res.status < 500) return true;
    } catch {
      // sigue esperando
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

let spawnedServer = null;

async function ensureServer() {
  try {
    const res = await fetch(BASE_URL + '/login', { redirect: 'manual' });
    if (res.status < 500) {
      writeLine(`[verify-bundle] Reutilizando servidor en ${BASE_URL}`);
      return false;
    }
  } catch {
    // no está corriendo
  }

  writeLine('[verify-bundle] Levantando servidor standalone para medir el JS inicial...');

  const standalone = path.join(ROOT, '.next', 'standalone');
  const staticSource = path.join(ROOT, '.next', 'static');
  const staticTarget = path.join(standalone, '.next', 'static');
  const publicTarget = path.join(standalone, 'public');

  if (!fs.existsSync(path.join(staticTarget, 'chunks'))) {
    fs.mkdirSync(path.dirname(staticTarget), { recursive: true });
    fs.cpSync(staticSource, staticTarget, { recursive: true });
  }
  if (!fs.existsSync(path.join(publicTarget))) {
    fs.cpSync(path.join(ROOT, 'public'), publicTarget, { recursive: true });
  }

  const server = spawn(
    'node',
    [path.join(standalone, 'server.js')],
    {
      env: {
        ...process.env,
        PORT: '3199',
        HOSTNAME: '127.0.0.1',
        MONGODB_URI: TEST_MONGODB_URI,
        JWT_SECRET: TEST_JWT_SECRET,
      },
      stdio: 'ignore',
    }
  );
  spawnedServer = server;

  const ok = await waitForServer(BASE_URL);
  if (!ok) {
    throw new Error('No se pudo levantar el servidor standalone para medir');
  }
  writeLine('[verify-bundle] Servidor standalone listo');
  return true;
}

let cachedSessionCookie = '';

async function getSessionCookie() {
  if (cachedSessionCookie) return cachedSessionCookie;
  const login = await fetch(BASE_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  if (login.ok) {
    const setCookie = login.headers.get('set-cookie');
    if (setCookie) cachedSessionCookie = setCookie.split(';')[0];
  }
  return cachedSessionCookie;
}

async function fetchWithSession(routePath) {
  const headers = {};
  if (routePath !== '/login' && routePath !== '/register' && TEST_EMAIL && TEST_PASSWORD) {
    const cookie = await getSessionCookie();
    if (cookie) headers.Cookie = cookie;
  }
  return fetch(BASE_URL + routePath, { redirect: 'follow', headers });
}

async function initialJsForRoute(routePath) {
  const res = await fetchWithSession(routePath);
  const html = await res.text();
  const chunkFiles = [
    ...new Set(
      [...html.matchAll(/\/_next\/static\/chunks\/([a-z0-9_.-]+\.js)/g)].map((m) => m[1])
    ),
  ];
  const chunks = [];
  let totalGzip = 0;
  for (const file of chunkFiles) {
    const filePath = path.join(CHUNKS_DIR, file);
    if (!fs.existsSync(filePath)) {
      chunks.push({ file, gzip: 0, missing: true });
      continue;
    }
    const gzip = gzipSize(fs.readFileSync(filePath));
    totalGzip += gzip;
    chunks.push({ file, gzip });
  }
  return { route: routePath, status: res.status, chunkCount: chunks.length, totalGzip, chunks };
}

async function checkChunkBudget() {
  writeLine('\n--- Chunks cliente (budget 100 KB gzip) ---');
  const files = fs.readdirSync(CHUNKS_DIR).filter((f) => f.endsWith('.js'));
  let maxGzip = 0;
  let maxFile = '';
  let totalRaw = 0;
  let totalGzip = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(CHUNKS_DIR, file));
    const gzip = gzipSize(raw);
    totalRaw += raw.length;
    totalGzip += gzip;
    if (gzip > maxGzip) {
      maxGzip = gzip;
      maxFile = file;
    }
  }

  writeLine(
    `chunks: ${files.length}, total raw: ${totalRaw} B, total gzip: ${totalGzip} B, ` +
      `máximo: ${maxFile} ${maxGzip} B gzip`
  );

  if (maxGzip > CHUNK_BUDGET) {
    const exception = exceptions.find((entry) => entry.type === 'chunk' && entry.maxGzip >= maxGzip);
    if (exception) {
      passed.push(`chunk ${maxFile} excede ${CHUNK_BUDGET} pero tiene excepción (${exception.reason})`);
    } else {
      failures.push(`chunk ${maxFile} supera 100 KB gzip (${maxGzip} B) sin excepción`);
    }
  } else {
    passed.push(`max chunk gzip ${maxGzip} B <= 100 KB`);
  }

  return { files: files.length, totalRaw, totalGzip, maxGzip, maxFile };
}

async function checkRouteBudgets() {
  writeLine('\n--- JS inicial por ruta ---');
  const report = {};

  const evaluateRoute = async (routePath, budget) => {
    const measurement = await initialJsForRoute(routePath);
    report[routePath] = measurement;
    writeLine(
      `  ${routePath}: ${measurement.totalGzip} B gzip (${measurement.chunkCount} chunks, status ${measurement.status})`
    );

    if (measurement.totalGzip > budget) {
      const exception = routeException(routePath);
      if (exception && measurement.totalGzip <= exception.budgetGzip) {
        passed.push(`ruta ${routePath} usa excepción documentada (budget ${exception.budgetGzip} B)`);
      } else {
        failures.push(
          `ruta ${routePath}: ${measurement.totalGzip} B gzip > ${budget} B sin excepción`
        );
      }
    } else {
      passed.push(`ruta ${routePath}: ${measurement.totalGzip} B gzip <= ${budget} B`);
    }
  };

  const routes = ['/login', '/register', '/'];
  for (const routePath of routes) {
    const budget =
      routePath === '/login' || routePath === '/register' ? AUTH_BUDGET : DASHBOARD_BUDGET;
    await evaluateRoute(routePath, budget);
  }

  if (TEST_EMAIL && TEST_PASSWORD) {
    for (const routePath of ['/control', '/metas', '/perfil', '/report', '/help', '/onboarding']) {
      await evaluateRoute(routePath, DASHBOARD_BUDGET);
    }
  }

  return report;
}

async function checkSeedAbsentFromBuild() {
  writeLine('\n--- /api/seed ausente del build ---');
  const filesToCheck = [
    path.join(ROOT, '.next', 'app-path-routes-manifest.json'),
    path.join(ROOT, '.next', 'routes-manifest.json'),
  ];
  let clean = true;
  for (const file of filesToCheck) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (/api\/seed/.test(content)) {
      clean = false;
      failures.push(`/api/seed aparece en ${path.relative(ROOT, file)}`);
    }
  }
  if (clean) passed.push('/api/seed no aparece en los manifests del build');
  return clean;
}

async function checkSourceMaps() {
  writeLine('\n--- Source maps públicos ---');
  let mapFound = false;
  const chunksDir = CHUNKS_DIR;
  const jsFiles = fs.readdirSync(chunksDir).filter((f) => f.endsWith('.js'));
  const sampled = new Set();

  const turbopackRuntime = jsFiles.find((f) => f.startsWith('turbopack-'));
  if (turbopackRuntime) sampled.add(turbopackRuntime);

  const bySize = jsFiles
    .map((f) => ({ file: f, size: fs.statSync(path.join(chunksDir, f)).size }))
    .sort((a, b) => b.size - a.size);
  for (const { file } of bySize.slice(0, 2)) sampled.add(file);

  for (const file of sampled) {
    const sample = `/_next/static/chunks/${file}.map`;
    const res = await fetch(BASE_URL + sample, { redirect: 'manual' });
    if (res.status === 200) {
      mapFound = true;
      failures.push(`source map público responde 200: ${sample}`);
    } else {
      passed.push(`source map ${sample} -> ${res.status}`);
    }
  }

  const serverMaps = path.join(ROOT, '.next', 'server');
  const localMapCount = fs
    .readdirSync(serverMaps, { recursive: true })
    .filter((f) => String(f).endsWith('.map')).length;
  writeLine(`source maps locales en .next/server: ${localMapCount} (no expuestos públicamente)`);

  if (mapFound) return false;
  return true;
}

async function main() {
  await ensureServer();
  const chunksSummary = await checkChunkBudget();
  const routesReport = await checkRouteBudgets();
  await checkSeedAbsentFromBuild();
  await checkSourceMaps();

  const report = {
    fecha: new Date().toISOString(),
    baseUrl: BASE_URL,
    chunks: chunksSummary,
    routes: routesReport,
    budgets: {
      auth: AUTH_BUDGET,
      dashboard: DASHBOARD_BUDGET,
      chunk: CHUNK_BUDGET,
    },
    excepciones: exceptions,
    result: failures.length === 0 ? 'PASS' : 'FAIL',
    failures,
  };

  writeLine('\n--- Resultado ---');
  for (const ok of passed) writeLine(`  [OK] ${ok}`);
  for (const fail of failures) writeLine(`  [FAIL] ${fail}`);
  writeLine(`\n[verify-bundle] ${report.result}`);

  if (!fs.existsSync(EVIDENCIA)) fs.mkdirSync(EVIDENCIA, { recursive: true });
  fs.writeFileSync(path.join(EVIDENCIA, 'bundle-report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(EVIDENCIA, 'bundle-report.log'), log.join('\n') + '\n');

  if (spawnedServer) spawnedServer.kill();

  if (failures.length > 0) process.exit(1);
  process.exit(0);
}

main().catch((error) => {
  console.error(`[verify-bundle] Error: ${error.message}`);
  if (spawnedServer) spawnedServer.kill();
  process.exit(1);
});