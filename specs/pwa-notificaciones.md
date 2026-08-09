---
name: spec-pwa-notificaciones
description: "Spec aprobada: PWA instalable + notificaciones locales con Service Worker para CashinsightApp."
---

# SPEC — PWA instalable + notificaciones locales

## 1. Problema
La app corre en localhost (Next.js + MongoDB local) y solo se usa desde el navegador. Hoy no tiene:
- **Manifest**: no se puede instalar como app (home screen / standalone).
- **Service Worker**: sin SW no hay notificaciones del sistema ni criterios de instalabilidad.
- **Notificaciones**: cuando el usuario supera un límite de Control, el presupuesto diario o alcanza una meta, la única señal es la UI en pantalla (que puede no estar visible).

Feature sacada de "Fuera de Alcance" de la constitution (sección 4 actualizada).

## 2. Solución propuesta
Agregar soporte PWA nativo de Next.js 16 (manifest.ts) + un Service Worker estático con registro desde el cliente + **notificaciones locales** (`registration.showNotification`) disparadas por eventos del cliente al superar umbrales. Sin push remoto (ver Out of Scope).

## 3. Usuarios afectados
- Único usuario local de la app (instalación en su navegador/dispositivo, avisos mientras usa la app).

## 4. Flujos de usuario
1. Usuario abre `/perfil` → sección "Notificaciones" → activa → el navegador pide permiso → de ahora en más, al superar un límite o meta, recibe una notificación del sistema.
2. Usuario instala la app desde el navegador (prompt nativo en Chromium; en iOS/Safari, instrucciones en pantalla) y la abre en modo standalone.
3. Usuario navega y supera el 100% de un límite de Control → el sistema muestra una notificación una única vez por sesión para ese límite.

## 5. Requisitos funcionales
- [ ] **RF1** `src/app/manifest.ts` con `MetadataRoute.Manifest`: `name: "Cashinsight"`, `short_name: "Cashinsight"`, `description`, `start_url: "/"`, `display: "standalone"`, `background_color`/`theme_color` acordes al tema claro, `icons` 192 y 512.
- [ ] **RF2** Iconos PNG en `public/` (`icon-192x192.png`, `icon-512x512.png` + `maskable` si el generador lo permite) coherentes con el diseño brutalista (fondo ink oscuro + acento lime). Generados con script one-off (preferir ImageMagick `convert` si está en el sistema; verificar `which convert`. Si no hay, usar SVGs en el manifest con `sizes: "any"`).
- [ ] **RF3** `public/sw.js`: estático, con `CACHE_NAME` versionado, instalación con precache mínimo del shell (`/`, `/login`, `/perfil`), `fetch` handler (navegación → cache-first con fallback a red; assets estáticos → stale-while-revalidate), handlers de `notificationclick` (abre/enfoca la URL del aviso) y `notificationclose`.
- [ ] **RF4** Registro del SW desde el cliente: componente `PwaRegister` (o hook en el layout) que registra `navigator.serviceWorker.register('/sw.js')` con guard `'serviceWorker' in navigator` y `document.readyState`. Debe ser inofensivo en SSR/JSdom (guards).
- [ ] **RF5** `src/lib/notifications.ts`: helpers `isSupported()`, `requestNotificationPermission()`, `getPermission()` y `showNotification({ title, body, url })` que usa `navigator.serviceWorker.ready` → `registration.showNotification` con `icon`, `badge`, `data: { url }`. Manejo de errores silencioso (nunca rompe el flujo de la app).
- [ ] **RF6** UI en `/perfil`: sección "Notificaciones" con estado real (soporte del navegador, permiso actual), botón "Activar notificaciones" / "Desactivar" y texto breve. Si el permiso está denegado, mensaje explicando cómo rehabilitarlo en el navegador.
- [ ] **RF7** Disparadores en el cliente (hooks existentes de datos, sin polling): al obtener datos de `/` (Principal) y `/control`, verificar condiciones → `showNotification`:
  - Límite de Control superado (`status === 'excedido'` y el exceso supera un umbral mínimo, ej. >0).
  - Gastos del día superan el presupuesto diario (`perDay` del reporte summary).
  - Meta alcanzada (progreso 100%).
- [ ] **RF8** Deduplicación por sesión: un `Set` en memoria con clave por notificación (ej. `limit:<categoryId>`, `daily`, `goal:<goalId>`) para no repetir la misma notificación.
- [ ] **RF9** Textos en español rioplatense, claros y accionables (botón de la notificación → ruta correspondiente).
- [ ] **RF10** Tests: unit de `notifications.ts` (mocks de `Notification`/`registration`/`serviceWorker`), test de la sección del perfil si es extraíble como componente, y verificación de que `sw.js` no rompe lint/build. Los tests jsdom ya cuentan con el patrón de mocks.
- [ ] **RF11** Verificación manual documentada: `next build && next start`, DevTools → Application → Manifest válido + SW activo + prueba de notificación.

## 6. Requisitos no funcionales
- Performance: `sw.js` y iconos son estáticos (sin impacto en runtime); el registro es async y no bloquea render.
- Seguridad: sin secretos; el SW es estático y no expone datos; las notificaciones no incluyen montos sensibles (textos genéricos: "Superaste el límite de Ocio").
- Compatibilidad: objetivo primario Chromium (instalación + notificaciones); Firefox soportado; Safari/iOS con el comportamiento que el navegador permita (sin trabajo extra).
- Sin dependencias npm nuevas (SW a mano, iconos por script one-off).

## 7. Criterios de aceptación
- [ ] Dado `npm run build && npm start`, cuando pido `/manifest.webmanifest` o `/manifest`, entonces responde 200 con un objeto Manifest válido (name, icons 192/512).
- [ ] Dado `npm start`, cuando pido `/sw.js`, entonces responde 200 con content-type JavaScript.
- [ ] Dado Chromium con la app abierta, cuando cargo, entonces `navigator.serviceWorker.controller`/registro activo con scope `/` en DevTools → Application.
- [ ] Dado permiso de notificaciones concedido, cuando un límite pasa a `excedido`, entonces se muestra una notificación del sistema exactamente una vez por sesión para ese límite.
- [ ] Dado `/perfil` sin permiso, cuando abro la sección Notificaciones, entonces veo el estado y el botón para activar.
- [ ] Dado la suite de tests, cuando corro `npm test`, entonces los tests previos + nuevos pasan (jsdom con mocks).
- [ ] Dado `npm run lint`, `npx tsc --noEmit` y `npm run build`, cuando corro, entonces sin errores.
- [ ] Dado `sw.js`, cuando lo reviso, entonces el `notificationclick` abre la URL del aviso y no hay secretos hardcodeados.

## 8. Dependencias
- Next.js 16 nativo: `app/manifest.ts` (MetadataRoute.Manifest) — sin plugins.
- `public/`: iconos PNG + `sw.js`.
- Infraestructura de tests ya existente (Vitest + jsdom + Testing Library).
- Sin dependencias npm nuevas.

## 9. Riesgos / Incertidumbres
- **SW en dev con Turbopack**: el registro en `next dev` puede comportarse distinto (cache del SW). Mitigación: verificación final con `next build && next start` (como indica la guía oficial); en dev se puede probar igual porque `public/` se sirve.
- **Chrome exige HTTPS o localhost**: localhost está permitido; documentar si algún día se deploya fuera.
- **Permiso denegado**: la UI debe reflejar el estado y dar instrucciones (no se puede forzar el permiso desde JS).
- **Deduplicación**: sin el Set, las notificaciones se repetirían en cada re-render/fetch. RF8 lo cubre.
- **Iconos**: si no hay ImageMagick en el sistema, usar SVG en el manifest (compatible con instalación Chrome).
- **Notificaciones sin permiso en jsdom**: los tests deben mockear `Notification` y `navigator.serviceWorker` (patrón ya usado en tests de componentes).

## 10. Out of Scope (explícito)
- **NO** push remoto (web-push / VAPID / suscripciones PushManager): requiere servidor 24/7 o cron para tener disparadores; sin server dedicado no aporta valor.
- **NO** recordatorios programados / cron externos.
- **NO** offline cache de datos y API (la app consume su propio backend local: si la máquina está arriba, localhost responde; si no, no hay datos que mostrar).
- **NO** badges/contadores avanzados ni iOS install-sheet dedicado.
- **NO** dependencias npm nuevas.