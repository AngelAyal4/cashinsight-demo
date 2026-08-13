#!/usr/bin/env node
// Smoke test HTTP de la superficie de producción.
//
// Verifica:
//   - ausencia de X-Powered-By en respuestas HTML/API;
//   - /api/seed ya no existe (404) y no revela datos de ejemplo;
//   - páginas privadas redirigen a /login sin sesión;
//   - páginas privadas responden 200 con sesión;
//   - source maps públicos responden 404;
//   - robots.txt y sitemap.xml presentes.
//
// Uso:
//   node scripts/verify-surface.mjs
//   BASE_URL=http://localhost:3100 TEST_EMAIL=x TEST_PASSWORD=y node scripts/verify-surface.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const EVIDENCIA = path.join(ROOT, 'evidencia', 'hardening-runtime-predeploy');
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3100').replace(/\/$/, '');
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

const log = [];
const failures = [];
const passed = [];

function writeLine(line) {
  log.push(line);
  console.log(line);
}

async function getWithSession(routePath) {
  const login = await fetch(BASE_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const setCookie = login.ok ? login.headers.get('set-cookie') : null;
  const headers = setCookie ? { Cookie: setCookie.split(';')[0] } : {};
  return fetch(BASE_URL + routePath, { redirect: 'manual', headers });
}

async function main() {
  writeLine(`[verify-surface] BASE_URL=${BASE_URL}`);

  // 1. Headers: sin X-Powered-By
  writeLine('\n--- Headers de producción ---');
  const loginRes = await fetch(BASE_URL + '/login', { redirect: 'manual' });
  const poweredBy = loginRes.headers.get('x-powered-by');
  if (poweredBy) {
    failures.push(`X-Powered-By presente: ${poweredBy}`);
  } else {
    passed.push('X-Powered-By ausente en /login');
  }

  const apiRes = await fetch(BASE_URL + '/api/auth/me', { redirect: 'manual' });
  if (apiRes.headers.get('x-powered-by')) {
    failures.push('X-Powered-By presente en respuesta API');
  } else {
    passed.push('X-Powered-By ausente en /api/auth/me');
  }

  // 2. /api/seed ausente
  writeLine('\n--- /api/seed ausente ---');
  const seedGet = await fetch(BASE_URL + '/api/seed', { redirect: 'manual' });
  const seedPost = await fetch(BASE_URL + '/api/seed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    redirect: 'manual',
  });
  const seedGetBody = await seedGet.text();
  const seedPostBody = await seedPost.text();

  for (const [method, res, body] of [
    ['GET', seedGet, seedGetBody],
    ['POST', seedPost, seedPostBody],
  ]) {
    const hasData =
      /Datos de ejemplo|Ya existe data|transacciones|Categorías/.test(body);
    if (res.status === 200 || hasData) {
      failures.push(`/api/seed ${method} responde ${res.status} con contenido de seed`);
    } else {
      passed.push(`/api/seed ${method} -> ${res.status} (sin datos de ejemplo)`);
    }
  }

  // 3. Redirecciones sin sesión
  writeLine('\n--- Redirecciones sin sesión ---');
  const privateRoutes = ['/', '/control', '/metas', '/perfil', '/report', '/help', '/onboarding'];
  for (const route of privateRoutes) {
    const res = await fetch(BASE_URL + route, { redirect: 'manual' });
    const location = res.headers.get('location') || '';
    if (res.status >= 300 && res.status < 400 && location.includes('/login')) {
      passed.push(`${route} -> ${res.status} ${location} (redirige a /login)`);
    } else {
      failures.push(`${route} sin sesión -> ${res.status} location=${location} (se esperaba redirect a /login)`);
    }
  }

  // 4. Páginas con sesión
  writeLine('\n--- Páginas con sesión ---');
  if (TEST_EMAIL && TEST_PASSWORD) {
    for (const route of ['/', '/control', '/metas', '/perfil', '/report', '/help', '/onboarding']) {
      const res = await getWithSession(route);
      if (res.status === 200) {
        passed.push(`${route} con sesión -> 200`);
      } else {
        failures.push(`${route} con sesión -> ${res.status}`);
      }
    }
  } else {
    writeLine('  TEST_EMAIL/TEST_PASSWORD no provistos; se omite la verificación con sesión.');
  }

  // 5. Source maps públicos
  writeLine('\n--- Source maps públicos ---');
  for (const sample of ['/_next/static/chunks/webpack.js.map']) {
    const res = await fetch(BASE_URL + sample, { redirect: 'manual' });
    if (res.status === 200) {
      failures.push(`source map público responde 200: ${sample}`);
    } else {
      passed.push(`source map ${sample} -> ${res.status}`);
    }
  }

  // 6. robots y sitemap
  writeLine('\n--- robots.txt y sitemap.xml ---');
  const robots = await fetch(BASE_URL + '/robots.txt', { redirect: 'manual' });
  if (robots.status === 200) {
    passed.push('/robots.txt -> 200');
  } else {
    failures.push(`/robots.txt -> ${robots.status}`);
  }
  const sitemap = await fetch(BASE_URL + '/sitemap.xml', { redirect: 'manual' });
  if (sitemap.status === 200) {
    passed.push('/sitemap.xml -> 200');
  } else {
    failures.push(`/sitemap.xml -> ${sitemap.status}`);
  }

  // Resultado
  writeLine('\n--- Resultado ---');
  for (const ok of passed) writeLine(`  [OK] ${ok}`);
  for (const fail of failures) writeLine(`  [FAIL] ${fail}`);

  const result = failures.length === 0 ? 'PASS' : 'FAIL';
  writeLine(`\n[verify-surface] ${result}`);

  if (!fs.existsSync(EVIDENCIA)) fs.mkdirSync(EVIDENCIA, { recursive: true });
  fs.writeFileSync(path.join(EVIDENCIA, 'surface-report.log'), log.join('\n') + '\n');

  if (failures.length > 0) process.exit(1);
  process.exit(0);
}

main().catch((error) => {
  console.error(`[verify-surface] Error: ${error.message}`);
  process.exit(1);
});