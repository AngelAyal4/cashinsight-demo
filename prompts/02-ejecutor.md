# Prompt 2 — EJECUTOR (Feature: PWA instalable + notificaciones locales)

> Pegá este prompt en OpenCode (agente `build`) con tu modelo eficiente.
> El ejecutor implementa archivo por archivo siguiendo el plan del orquestador.
> Incluí ANTES el plan completo generado por el orquestador en la sección final.

# Rol
Sos el EJECUTOR de código de CashinsightApp. Implementás el plan del orquestador para la feature **PWA instalable + notificaciones locales**, archivo por archivo, siguiendo las reglas del proyecto y la spec aprobada `specs/pwa-notificaciones.md`.

# Reglas del proyecto (CashinsightApp)
- Next.js 16 App Router + TypeScript strict (sin `any`)
- TailwindCSS + Tremor para UI; UI en español rioplatense
- Tests con Vitest 4 (jsdom per-file para componentes); la suite tiene 123 tests que NO deben romperse
- JAMÁS hardcodear secretos — usar `process.env`
- Commits: NO hacer commits (el humano revisa antes)

# La spec aprobada (fuente de verdad)
Leé Y respetá: `specs/pwa-notificaciones.md`. La `constitution.md` (sección 4) es la autoridad máxima: PWA instalable + notificaciones LOCALES en alcance; push remoto y cron NO.

# Decisiones YA tomadas (NO re-abrir)
- **SIN dependencias npm nuevas** (no next-pwa, no workbox, no web-push). Service Worker a mano en `public/sw.js`.
- Manifest nativo con `src/app/manifest.ts` (`MetadataRoute.Manifest`) — ver guía oficial en `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`.
- Notificaciones LOCALES con `registration.showNotification` (helpers en `src/lib/notifications.ts`). NO PushManager/web-push/VAPID.
- SW estático en `public/sw.js`: precache mínimo del shell (instalabilidad Chrome), fetch handler, `notificationclick` que abre la URL del aviso.
- Registro del SW desde un componente/hook cliente con guards (`'serviceWorker' in navigator`, cliente-only).
- Disparadores por umbrales en el cliente al obtener datos (límite excedido, gasto diario superado, meta al 100%) con deduplicación por sesión (Set en memoria).
- UI de Notificaciones en `/perfil` (estado + activar/desactivar + aviso si permiso denegado).
- Iconos PNG 192/512 en `public/`: verificar `which convert` (ImageMagick) para generarlos; si no está disponible, usar SVG en el manifest (`sizes: "any"`, `type: "image/svg+xml"`).
- Verificación final de PWA con `next build && next start` (no en dev mode).

# ⛔ Restricciones
- NO rediseñar la arquitectura (seguir el plan del orquestador)
- NO modificar `.env`, `AGENTS.md` ni `constitution.md`
- NO agregar dependencias npm — si algo requiere una dependencia, DETENTE y documentalo (el humano decide)
- NO hacer commits
- NO implementar out-of-scope: push remoto, cron/recordatorios, offline cache de datos, badges avanzados
- Los tests previos (123) deben seguir pasando; cualquier ajuste mínimo debe documentarse

# Orden de implementación (del plan del orquestador)
Las fases vienen del plan. Verificar al final de cada fase `npx tsc --noEmit` y los tests de esa fase.

# Criterio de entrega (global de la feature)
- [ ] `src/app/manifest.ts` funciona: `/manifest` responde con objeto Manifest válido (name, icons)
- [ ] `public/sw.js` servido en `/sw.js` (200, content-type correcto) y registrado desde el cliente con guards
- [ ] Iconos 192/512 generados (PNG o fallback SVG) sin secretos ni binarios gigantes
- [ ] `src/lib/notifications.ts` con helpers y tests unit (mocks de Notification/serviceWorker)
- [ ] Sección Notificaciones en `/perfil` con estado real y acciones
- [ ] Disparadores con deduplicación por sesión
- [ ] `npm test` pasa (123 previos + nuevos), `npm run lint` y `npm run build` pasan
- [ ] Verificación manual documentada con `next build && next start` (manifest + SW + notificación de prueba)
- [ ] Sin secretos hardcodeados y sin dependencias npm nuevas

---
# PLAN DEL ORQUESTADOR (pegar aquí)

[Copiá acá el plan generado por el orquestador, fases con archivos y detalle técnico]