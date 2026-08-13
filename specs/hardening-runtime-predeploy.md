---
name: hardening-runtime-predeploy
description: "Hardening, consola y presupuesto de JavaScript antes del deploy Vercel de CashinsightApp."
---

# SPEC — Hardening y calidad runtime pre-deploy

> Estado: propuesta para orquestador/ejecutor
> Prioridad: alta
> Fecha: 2026-08-13
> Dependencia: `constitution.md`, `specs/deploy-vercel-atlas.md`, `SECURITY-CHECKLIST.md`

## 1. Problema

La revisión pre-deploy detectó cuatro superficies que deben cerrarse antes de Vercel:

1. La respuesta HTTP todavía expone `X-Powered-By: Next.js`.
2. Existe `/api/seed`, una ruta de datos de ejemplo que aparece en el build de producción. Aunque exige sesión, no debe formar parte de la superficie de producción.
3. No existe una verificación automatizada de consola del navegador para los flujos principales.
4. El proyecto no tiene un presupuesto declarado para el JavaScript cliente. El build actual produce aproximadamente 1,20 MB raw acumulado en chunks cliente, con un chunk máximo de aproximadamente 290 KB raw / 87 KB gzip; esto no prueba una regresión crítica, pero sí una deuda de control.

La meta es llegar al deploy con una superficie de producción mínima, consola limpia y un criterio reproducible para detectar crecimiento accidental del bundle.

## 2. Solución propuesta

### 2.1 Headers de producción

Configurar Next.js para no enviar `X-Powered-By`, sin tocar los headers necesarios del service worker. Verificar el header en una respuesta real de producción local y luego en Vercel.

### 2.2 Seed fuera de producción

Eliminar `/api/seed` como endpoint HTTP de producción. Si el seed sigue siendo necesario para desarrollo, moverlo a un script/flujo local explícito que use Mongo directamente y nunca se incluya como ruta API en el build desplegable.

El script local debe ser idempotente y conservar el comportamiento útil de crear categorías/datos de ejemplo, pero debe requerir una ejecución explícita desde terminal y nunca aceptar datos del request.

### 2.3 Consola del navegador

Agregar una verificación reproducible de navegador para las rutas y flujos principales:

- `/login` y `/register` sin sesión;
- redirección de `/`, `/control`, `/metas`, `/perfil`, `/report`, `/help` y `/onboarding` sin sesión;
- login con la cuenta de prueba en local;
- dashboard, control, metas, perfil y reportes con sesión;
- abrir/cerrar los modales principales;
- navegación a una ruta inexistente.

Los errores esperables de API deben mostrarse en UI y no generar `console.error` durante el flujo normal. Los logs server-side de errores inesperados se mantienen, pero no deben incluir secretos, tokens, passwords ni datos personales completos.

### 2.4 Presupuesto de bundle

Definir budgets sin agregar dependencias obligatorias:

- ningún chunk cliente individual mayor a **100 KB gzip** sin justificación documentada;
- JavaScript inicial transferido por una ruta pública/auth menor o igual a **150 KB gzip**;
- JavaScript inicial transferido por una ruta dashboard menor o igual a **250 KB gzip**;
- el total de chunks puede crecer solo con justificación funcional; se registra raw y gzip como baseline en el review;
- Recharts, Tremor u otra librería pesada no debe cargarse en rutas que no la usan;
- si un budget falla, resolver con importación diferida, división por ruta o eliminación de dependencia antes de deploy.

Los umbrales son límites de revisión para este MVP, no una promesa de rendimiento universal. Si una excepción es necesaria, debe incluir tamaño, motivo, ruta afectada y plan de reducción.

## 3. Usuarios afectados

- Todos los visitantes y usuarios autenticados de la aplicación.
- Equipo responsable del deploy Vercel y del mantenimiento de la app.
- Usuarios de desarrollo que necesiten datos demo localmente.

## 4. Flujos de usuario

1. Visitante solicita `/login` → recibe respuesta sin `X-Powered-By` y sin errores de consola.
2. Usuario no autenticado solicita `/api/seed` → el endpoint no existe en la build final o responde `404` sin revelar que hay una operación de seed.
3. Desarrollador ejecuta el seed local → usa un comando explícito y documentado, contra Mongo local, sin ruta HTTP pública.
4. Usuario navega por los flujos principales → la consola permanece limpia salvo errores deliberadamente provocados durante una prueba negativa.
5. CI/review ejecuta el chequeo de bundle → reporta tamaños raw/gzip y falla si se superan los límites sin excepción aprobada.
6. Deploy Vercel → smoke test confirma headers, seed ausente, status de rutas, consola y budgets.

## 5. Requisitos funcionales

- [ ] Configurar `poweredByHeader: false` en `next.config.ts` sin romper la configuración `output` condicional Vercel/Docker.
- [ ] Eliminar `src/app/api/seed/route.ts` del despliegue de producción.
- [ ] Crear un mecanismo de seed local explícito fuera de `src/app/api`, si el desarrollo todavía lo necesita.
- [ ] Documentar el comando de seed local y advertir que nunca debe ejecutarse contra Atlas de producción salvo una operación migratoria deliberada.
- [ ] Agregar tests para confirmar que la ruta de seed ya no está registrada o responde 404 en la build final.
- [ ] Crear una verificación de consola para los flujos definidos en esta spec, preferentemente reutilizable en el review de deploy.
- [ ] Crear un chequeo de bundle que reporte por lo menos cantidad de chunks, total raw, total gzip, máximo raw y máximo gzip.
- [ ] Hacer que el chequeo de bundle falle cuando se superen los budgets sin una excepción documentada.
- [ ] Verificar source maps públicos: ningún `/_next/static/**/*.js.map` debe responder con contenido en producción.
- [ ] Conservar el logging server-side útil, pero eliminar logs de debug y evitar secretos/tokens en logs públicos o de cliente.

## 6. Requisitos no funcionales

- **Seguridad:** no exponer detalles del stack; no dejar endpoints de seed/debug operativos en producción; no loguear secretos.
- **Compatibilidad:** no agregar una dependencia de navegador pesada solo para probar consola si puede usarse la infraestructura de testing existente.
- **Serverless:** el mecanismo de seed local no puede depender de que Vercel tenga filesystem persistente.
- **Performance:** los budgets se miden en build de producción, no en modo dev/Turbopack HMR.
- **Observabilidad:** los errores inesperados deben seguir siendo diagnosticables desde logs internos sin mostrarse al usuario.
- **Regresión cero:** deben seguir pasando todos los tests existentes y los criterios del deploy Vercel + Atlas.

## 7. Criterios de aceptación

- [ ] Dada una respuesta HTML o API de producción local, cuando se inspeccionan headers, entonces no aparece `X-Powered-By: Next.js`.
- [ ] Dado el build de producción, cuando se inspeccionan las rutas, entonces `/api/seed` no aparece como endpoint operativo.
- [ ] Dado un request a `/api/seed` en producción, cuando se consulta sin sesión o con sesión, entonces responde `404` genérico o no existe la ruta; nunca crea categorías ni transacciones.
- [ ] Dado el desarrollo local, cuando se ejecuta el comando de seed documentado, entonces crea datos demo de forma idempotente y no modifica una instancia remota por accidente.
- [ ] Dado `/login`, `/register`, `/`, `/control`, `/metas`, `/perfil`, `/report`, `/help`, `/onboarding` y una ruta inexistente, cuando se ejecuta la prueba de navegador, entonces no hay errores de consola inesperados.
- [ ] Dado un error de API provocado intencionalmente, cuando se muestra al usuario, entonces aparece un mensaje genérico y no un stack trace, URI de Mongo, token o password.
- [ ] Dado el build de producción, cuando se ejecuta el chequeo de bundle, entonces se reportan tamaños raw/gzip y todos los límites se cumplen o existe una excepción documentada en el reporte.
- [ ] Dado cualquier `*.js.map` público, cuando se solicita en producción, entonces responde `404` o no se entrega contenido de source map.
- [ ] `npm run test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` y `npm audit --audit-level=high` permanecen verdes.
- [ ] El deploy Vercel mantiene el comportamiento después de configurar `MONGODB_URI`, `JWT_SECRET` y `NEXT_PUBLIC_APP_URL`.

## 8. Dependencias

- `next.config.ts` actual, que ya tiene `output` condicional para Vercel/Docker.
- `src/app/api/seed/route.ts`, a retirar o reemplazar por script local.
- `src/proxy.ts`, para confirmar que las rutas privadas y la respuesta 404 no cambian de comportamiento.
- `package.json` y configuración de Vitest.
- `specs/deploy-vercel-atlas.md`.
- `SECURITY-CHECKLIST.md`, controles 8, 9, 10 y 18–20.

## 9. Riesgos / Incertidumbres

- El seed actual puede estar siendo usado manualmente aunque no haya referencias HTTP automatizadas; antes de eliminarlo hay que documentar el reemplazo.
- La prueba de consola requiere un navegador real; tests jsdom no detectan todos los errores de hidratación, carga de chunks o navegación.
- Los límites de bundle pueden variar con la versión de Next/Turbopack; el reporte debe diferenciar cambios de tooling de regresiones de la aplicación.
- `console.error` en el código fuente no equivale automáticamente a error de navegador: el review debe separar logs server-side de errores de cliente.
- Bloquear `X-Powered-By` reduce fingerprinting, pero no reemplaza headers de seguridad, rate limiting ni autorización.

## 10. Out of Scope (explícito)

- Implementar Sentry, Datadog u otro proveedor de monitoreo.
- Reescribir el dashboard para eliminar Recharts/Tremor si los budgets actuales se cumplen.
- Cambiar el modelo single-user.
- Crear rate limiting nuevo: ya está contemplado en el spec de deploy Vercel + Atlas.
- Exponer una interfaz administrativa para seed o migraciones.
- Cambiar la estrategia de autenticación JWT.
