#!/usr/bin/env node
// Prueba de consola del navegador con Chrome headless vía CDP.
//
// Recorre los flujos principales: rutas públicas, redirecciones sin sesión,
// login (éxito y credenciales incorrectas), páginas con sesión, modales
// principales (movimiento, límite, meta, aporte, retiro), ruta inexistente y
// logout. Fallará si aparece cualquier error de consola / excepción no esperada
// durante un paso que debe estar limpio.
//
// Uso:
//   node scripts/verify-console.mjs
//   BASE_URL=http://localhost:3100 TEST_EMAIL=x TEST_PASSWORD=y node scripts/verify-console.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(process.cwd());
const EVIDENCIA = path.join(ROOT, 'evidencia', 'hardening-runtime-predeploy');
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3100').replace(/\/$/, '');
const TEST_EMAIL = process.env.TEST_EMAIL || 'prueba@cashinsight.app';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'CashinsightDemo123!';
const WRONG_PASSWORD = process.env.WRONG_PASSWORD || 'contrasena-incorrecta-123';
const CDP_PORT = Number(process.env.CDP_PORT || '9223');
const CHROME_PROFILE = path.join(EVIDENCIA, 'chrome-console-profile');

const log = [];
const failures = [];
const passed = [];
let chrome = null;

function writeLine(line) {
  log.push(line);
  console.log(line);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchChrome() {
  const chromeBin =
    process.env.CHROME_BIN ||
    (fs.existsSync('/usr/bin/google-chrome-stable')
      ? '/usr/bin/google-chrome-stable'
      : 'google-chrome');

  chrome = spawn(
    chromeBin,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-sync',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${CHROME_PROFILE}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) return;
    } catch {
      // sigue esperando
    }
    await sleep(300);
  }
  throw new Error('Chrome no respondió en el puerto de debug');
}

class CDPPage {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.stepEvents = [];
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const handler = this.pending.get(message.id);
        if (handler) {
          this.pending.delete(message.id);
          if (message.error) handler.reject(new Error(message.error.message));
          else handler.resolve(message.result);
        }
        return;
      }
      this.events.push(message);
      this.stepEvents.push(message);
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async enable() {
    await this.send('Runtime.enable');
    await this.send('Page.enable');
    await this.send('Log.enable');
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`evaluate failed: ${result.exceptionDetails.text}`);
    }
    return result.result?.value;
  }

  async navigate(url, waitMs = 1200) {
    await this.send('Page.navigate', { url });
    await sleep(waitMs);
  }

  drainStep() {
    const events = this.stepEvents;
    this.stepEvents = [];
    return events;
  }

  consoleErrors(events) {
    const errors = [];
    for (const event of events) {
      if (event.method === 'Runtime.consoleAPICalled' && event.params?.type === 'error') {
        const text = (event.params.args || [])
          .map((arg) => arg.value ?? arg.description ?? '')
          .join(' ');
        errors.push(`console.error: ${text}`);
      }
      if (event.method === 'Runtime.exceptionThrown') {
        const detail = event.params?.exceptionDetails;
        const text = detail?.exception?.description || detail?.text || 'excepción';
        errors.push(`exceptionThrown: ${text}`);
      }
    }
    return errors;
  }

  networkErrors(events) {
    const errors = [];
    for (const event of events) {
      if (event.method === 'Log.entryAdded' && event.params?.entry?.level === 'error') {
        const entry = event.params.entry;
        const text = entry.text || '';
        if (text.includes('Failed to load resource')) {
          errors.push({ url: entry.url || '', text });
        }
      }
    }
    return errors;
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignorar
    }
  }
}

async function createPage() {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, {
    method: 'PUT',
  });
  const target = await res.json();
  const page = new CDPPage(target.webSocketDebuggerUrl);
  await page.open();
  await page.enable();
  return page;
}

async function waitFor(page, expression, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await page.evaluate(expression)) return true;
    await sleep(250);
  }
  return false;
}

async function setInput(page, selector, value) {
  const ok = await page.evaluate(
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`
  );
  if (!ok) throw new Error(`input no encontrado: ${selector}`);
}

async function clickButtonByText(page, text, selector = 'button') {
  const ok = await page.evaluate(
    `(() => {
      const candidates = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const el = candidates.find((b) => b.textContent.trim() === ${JSON.stringify(text)});
      if (!el) return false;
      el.click();
      return true;
    })()`
  );
  if (!ok) throw new Error(`botón no encontrado: ${text}`);
}

async function clearRateLimits() {
  if (!process.env.MONGODB_URI) return;
  try {
    const mongoose = await import('mongoose');
    await mongoose.default.connect(process.env.MONGODB_URI);
    const collection = mongoose.default.connection.collection('ratelimits');
    const result = await collection.deleteMany({});
    writeLine(`[verify-console] rate-limits limpiados: ${result.deletedCount} docs`);
    await mongoose.default.disconnect();
  } catch (error) {
    writeLine(
      `[verify-console] aviso: no se pudo limpiar el rate-limit (${error.message}); ` +
        'la prueba negativa puede disparar 429 en servers con límites acumulados'
    );
  }
}

async function fillAndSubmitLogin(page, email, password) {
  await setInput(page, '#email', email);
  await setInput(page, '#password', password);
  await clickButtonByText(page, 'Iniciar sesión');
}

async function main() {
  writeLine(`[verify-console] BASE_URL=${BASE_URL} CDP_PORT=${CDP_PORT}`);
  if (fs.existsSync(CHROME_PROFILE)) {
    fs.rmSync(CHROME_PROFILE, { recursive: true, force: true });
  }

  await clearRateLimits();
  await launchChrome();
  const page = await createPage();

  const step = async (
    name,
    action,
    { expectClean = true, expectPath = null, allowedNetwork = [] } = {}
  ) => {
    let actionError = null;
    try {
      await action();
    } catch (error) {
      actionError = error;
    }

    const events = page.drainStep();
    const consoleErrors = page.consoleErrors(events);
    const networkErrors = page.networkErrors(events).filter(
      (error) => !/favicon/i.test(error.url)
    );

    // Los 404 transitorios de payloads RSC (`?_rsc=` con clave rotada) son
    // ruido benigno: el router los reintenta con la clave nueva y la app sigue.
    const benignRsc404 = (error) =>
      /status of 404/.test(error.text) && /\?_rsc=/.test(error.url);

    const unexpectedNetwork = networkErrors.filter((error) => {
      const allowed = [...allowedNetwork, /favicon/i];
      return !allowed.some((pattern) => pattern.test(error.url)) && !benignRsc404(error);
    });

    const pathname = await page.evaluate('location.pathname').catch(() => null);

    if (actionError) {
      failures.push(`[${name}] ${actionError.message}`);
      writeLine(`  [FAIL] ${name}: ${actionError.message}`);
      return;
    }

    if (expectPath && pathname !== expectPath) {
      failures.push(`[${name}] pathname esperado ${expectPath}, actual ${pathname}`);
      writeLine(`  [FAIL] ${name}: pathname=${pathname} (esperaba ${expectPath})`);
      return;
    }

    if (expectClean && consoleErrors.length > 0) {
      failures.push(`[${name}] errores de consola: ${consoleErrors.join(' | ')}`);
      writeLine(`  [FAIL] ${name}: ${consoleErrors.join(' | ')}`);
      return;
    }

    if (expectClean && unexpectedNetwork.length > 0) {
      failures.push(
        `[${name}] requests con error inesperados: ${unexpectedNetwork
          .map((error) => `${error.url} (${error.text})`)
          .join(' | ')}`
      );
      writeLine(
        `  [FAIL] ${name}: ${unexpectedNetwork
          .map((error) => `${error.url} (${error.text})`)
          .join(' | ')}`
      );
      return;
    }

    passed.push(name);
    writeLine(`  [OK] ${name}`);
  };

  // 1. Rutas públicas
  await step('login-publico', () => page.navigate(`${BASE_URL}/login`), {
    expectPath: '/login',
  });
  await step('register-publico', () => page.navigate(`${BASE_URL}/register`), {
    expectPath: '/register',
  });

  // 2. Redirecciones sin sesión
  // Nota: con el service worker activo, las rutas del shell precacheadas (`/`,
  // `/perfil`) se sirven desde la cache de instalación (cache-first de navegación
  // según la spec PWA) y pueden conservar el pathname original mostrando la
  // página de login. Se verifica el efecto protector: se muestra el login y no
  // el contenido protegido.
  for (const route of ['/', '/control', '/metas', '/perfil', '/report', '/help', '/onboarding']) {
    await step(
      `sin-sesion:${route}`,
      async () => {
        await page.navigate(`${BASE_URL}${route}`);
        const loginVisible = await waitFor(page, "!!document.querySelector('#email')", 8000);
        if (!loginVisible) throw new Error(`no se muestra el login desde ${route}`);
      }
    );
  }

  // 3. Ruta inexistente
  await step(
    'ruta-inexistente',
    async () => {
      await page.navigate(`${BASE_URL}/ruta-inexistente`);
      const has404 = await waitFor(page, "document.body.textContent.includes('404')");
      if (!has404) throw new Error('la página 404 no muestra el código 404');
    },
    { expectPath: '/ruta-inexistente', allowedNetwork: [/\/ruta-inexistente/] }
  );

  // 4. Login con credenciales incorrectas (prueba negativa)
  await step(
    'login-contraseña-incorrecta',
    async () => {
      await page.navigate(`${BASE_URL}/login`);
      await fillAndSubmitLogin(page, TEST_EMAIL, WRONG_PASSWORD);
      const hasError = await waitFor(page, "!!document.querySelector('#auth-error')");
      if (!hasError) throw new Error('no apareció el error de credenciales (#auth-error)');
    },
    { expectPath: '/login', allowedNetwork: [/\/api\/auth\/login/] }
  );

  // 5. Login correcto
  await step('login-ok', async () => {
    await fillAndSubmitLogin(page, TEST_EMAIL, TEST_PASSWORD);
    const onHome = await waitFor(page, "location.pathname === '/'");
    if (!onHome) throw new Error('no se llegó al dashboard tras el login');
  }, { expectPath: '/' });

  // 6. Dashboard + modal "Nuevo movimiento"
  await step('dashboard-modal-movimiento', async () => {
    await clickButtonByText(page, 'Nuevo movimiento');
    const dialogOpen = await waitFor(page, "!!document.querySelector('[role=dialog]')");
    if (!dialogOpen) throw new Error('no se abrió el modal de movimiento');
    await clickButtonByText(page, 'Cancelar');
    const dialogClosed = await waitFor(page, "!document.querySelector('[role=dialog]')");
    if (!dialogClosed) throw new Error('no se cerró el modal de movimiento');
  }, { expectPath: '/' });

  // 7. Control + modal "Nuevo límite"
  await step('control-modal-limite', async () => {
    await page.navigate(`${BASE_URL}/control`);
    await waitFor(page, "document.body.textContent.includes('Control')");
    await clickButtonByText(page, 'Nuevo límite');
    const dialogOpen = await waitFor(page, "!!document.querySelector('[role=dialog]')");
    if (!dialogOpen) throw new Error('no se abrió el modal de límite');
    await clickButtonByText(page, 'Cancelar');
    const dialogClosed = await waitFor(page, "!document.querySelector('[role=dialog]')");
    if (!dialogClosed) throw new Error('no se cerró el modal de límite');
  }, { expectPath: '/control' });

  // 8. Metas: aporte real (habilita retiro), nueva meta, retiro
  await step('metas-aporte', async () => {
    await page.navigate(`${BASE_URL}/metas`);
    await waitFor(page, "document.body.textContent.includes('Tus metas')");
    await clickButtonByText(page, 'Registrar aporte');
    const dialogOpen = await waitFor(page, "!!document.querySelector('[role=dialog]')");
    if (!dialogOpen) throw new Error('no se abrió el modal de aporte');
    await setInput(page, '[role="dialog"] input[inputMode="decimal"]', '5000');
    await clickButtonByText(page, 'Registrar ahorro');
    const dialogClosed = await waitFor(page, "!document.querySelector('[role=dialog]')", 20000);
    if (!dialogClosed) throw new Error('no se confirmó el aporte');
  }, { expectPath: '/metas' });

  await step('metas-nueva-meta', async () => {
    await clickButtonByText(page, 'Registrar nueva meta');
    const dialogOpen = await waitFor(page, "!!document.querySelector('[role=dialog]')");
    if (!dialogOpen) throw new Error('no se abrió el modal de nueva meta');
    await clickButtonByText(page, 'Cancelar');
    const dialogClosed = await waitFor(page, "!document.querySelector('[role=dialog]')");
    if (!dialogClosed) throw new Error('no se cerró el modal de nueva meta');
  }, { expectPath: '/metas' });

  await step('metas-retiro', async () => {
    await clickButtonByText(page, 'Retiro');
    const dialogOpen = await waitFor(page, "!!document.querySelector('[role=dialog]')");
    if (!dialogOpen) throw new Error('no se abrió el modal de retiro');
    await clickButtonByText(page, 'Cancelar');
    const dialogClosed = await waitFor(page, "!document.querySelector('[role=dialog]')");
    if (!dialogClosed) throw new Error('no se cerró el modal de retiro');
  }, { expectPath: '/metas' });

  // 9. Perfil y reportes con sesión
  await step('perfil', () => page.navigate(`${BASE_URL}/perfil`), { expectPath: '/perfil' });
  await step('reportes', () => page.navigate(`${BASE_URL}/report`), { expectPath: '/report' });

  // 10. Logout (desde perfil)
  await step('logout', async () => {
    await page.navigate(`${BASE_URL}/perfil`);
    await waitFor(page, "document.body.textContent.includes('Cerrar sesión')", 8000);
    await clickButtonByText(page, 'Cerrar sesión');
    const onLogin = await waitFor(page, "location.pathname === '/login'", 8000);
    if (!onLogin) throw new Error('no se volvió a /login tras cerrar sesión');
  }, { expectPath: '/login' });

  page.close();

  writeLine('\n--- Resultado ---');
  for (const ok of passed) writeLine(`  [OK] ${ok}`);
  for (const fail of failures) writeLine(`  [FAIL] ${fail}`);

  const result = failures.length === 0 ? 'PASS' : 'FAIL';
  writeLine(`\n[verify-console] ${result}`);

  const report = {
    fecha: new Date().toISOString(),
    baseUrl: BASE_URL,
    result,
    passed,
    failures,
  };

  if (!fs.existsSync(EVIDENCIA)) fs.mkdirSync(EVIDENCIA, { recursive: true });
  fs.writeFileSync(
    path.join(EVIDENCIA, 'console-report.json'),
    JSON.stringify(report, null, 2)
  );
  fs.writeFileSync(path.join(EVIDENCIA, 'console-report.log'), log.join('\n') + '\n');

  try {
    fs.rmSync(CHROME_PROFILE, { recursive: true, force: true });
  } catch {
    // el perfil pudo quedar bloqueado por Chrome
  }

  if (chrome) {
    try {
      chrome.kill('SIGKILL');
    } catch {
      // ignorar
    }
  }

  if (failures.length > 0) process.exit(1);
  process.exit(0);
}

main().catch((error) => {
  console.error(`[verify-console] Error: ${error.message}`);
  try {
    fs.rmSync(CHROME_PROFILE, { recursive: true, force: true });
  } catch {
    // ignorar
  }
  if (chrome) {
    try {
      chrome.kill('SIGKILL');
    } catch {
      // ignorar
    }
  }
  process.exit(1);
});