# Orquestador — Hardening y calidad runtime pre-deploy

Rol: **orquestador**. NO escribas código, NO edites archivos del proyecto y NO ejecutes la implementación. Solo leé, analizá y producí un PLAN accionable para un ejecutor posterior.

## Objetivo

Transformar `specs/hardening-runtime-predeploy.md` en un plan de implementación verificable para cerrar los hallazgos de hardening, consola y performance antes del deploy a Vercel.

## Lecturas obligatorias

Leé primero:

- `AGENTS.md`
- `constitution.md`
- `specs/hardening-runtime-predeploy.md`
- `specs/deploy-vercel-atlas.md`
- `next.config.ts`
- `package.json`
- `.gitignore`
- `.npmrc`
- `src/app/api/seed/route.ts`
- `src/proxy.ts`
- `src/test/setup.ts`
- configuración de Vitest
- tests que cubran API/auth/proxy
- `scripts/` y `docs/` relacionados con seed o desarrollo local
- componentes con Recharts, Tremor u otras librerías cliente pesadas

Podés leer otros archivos si necesitás fundamentar el plan. NUNCA leas ni incluyas en el plan: `.env`, `.env.*`, `node_modules/`, `.next/`, backups o secretos.

## Contexto ya auditado

Confirmá con lecturas, pero no vuelvas a investigar desde cero estos hechos:

- El proyecto usa Next.js 16 App Router, con `output` condicional para Docker/Vercel.
- La respuesta HTTP actual expone `X-Powered-By: Next.js`.
- Existe `src/app/api/seed/route.ts`; actualmente está protegido por sesión, pero aparece como ruta en el build y no debe quedar operativo en producción.
- El seed actual crea categorías y transacciones demo; el desarrollo puede necesitar reemplazo local explícito.
- La consola debe probarse en un navegador real; `console.*` en código server-side no prueba por sí solo un error de navegador.
- El build auditado produce aproximadamente 19 chunks cliente, 1,20 MB raw acumulado y un chunk máximo de aproximadamente 290 KB raw / 87 KB gzip.
- Los source maps existen dentro de artefactos locales `.next/server`, pero los requests públicos auditados devolvieron 404.
- El baseline funcional auditado es 212/212 tests, tsc verde, lint verde, build verde y `npm audit` sin vulnerabilidades.

## Tu tarea

Producí un plan fásico que cierre los hallazgos sin romper Docker local, Vercel, auth ni el seed de desarrollo.

El plan debe cubrir, en este orden lógico:

1. **Baseline y límites**
   - Confirmar `git status` limpio y ejecutar baseline antes de cambios.
   - Registrar headers actuales, presencia de `/api/seed`, rutas del build y tamaños raw/gzip.
   - Definir cómo se aplican estos budgets:
     - chunk cliente individual ≤100 KB gzip salvo excepción documentada;
     - JS inicial de rutas auth/públicas ≤150 KB gzip;
     - JS inicial de dashboard ≤250 KB gzip.
   - Aclarar qué métrica se mide y cómo evitar confundir total de chunks con JS inicial de una ruta.

2. **Hardening de headers**
   - Cambio exacto en `next.config.ts` para `poweredByHeader: false`.
   - Preservar `output` condicional Vercel/Docker y headers funcionales del service worker.
   - Verificación en `npm start`/producción local y luego en Vercel.

3. **Retiro del seed de producción**
   - Determinar qué referencias existentes dependen de `/api/seed`.
   - Planificar eliminación de `src/app/api/seed/route.ts` como ruta HTTP.
   - Diseñar reemplazo local explícito fuera de `src/app/api`, idempotente y sin aceptar datos desde request.
   - Documentar el comando, sus prerequisitos y una protección clara contra ejecutar contra Atlas por accidente.
   - Agregar/actualizar tests para demostrar que la ruta no aparece operativa en el build final y que el seed local conserva el comportamiento necesario.
   - No dejar una ruta “oculta” que responda 200, cree datos o revele que existe una operación administrativa en producción.

4. **Consola del navegador**
   - Diseñar una prueba de navegador real para:
     - `/login`;
     - `/register`;
     - redirecciones sin sesión de `/`, `/control`, `/metas`, `/perfil`, `/report`, `/help` y `/onboarding`;
     - login local con cuenta de prueba;
     - dashboard, control, metas, perfil, reportes;
     - modales principales;
     - ruta inexistente.
   - Definir cómo limpiar/capturar consola por navegación y cómo separar errores esperables de errores introducidos.
   - Si el proyecto no tiene infraestructura de browser test, proponer el mecanismo mínimo sin agregar una dependencia pesada automáticamente.
   - Mantener logs server-side útiles, pero evitar tokens, passwords, Mongo URI y datos personales completos.

5. **Bundle y source maps**
   - Crear una verificación reproducible de build que informe cantidad de chunks, total raw/gzip, máximo raw/gzip y métrica de JS inicial por ruta.
   - Decidir si conviene script propio o una verificación npm existente; no agregar dependencias sin justificación.
   - Identificar imports que puedan cargar Recharts/Tremor en rutas que no los usan.
   - Solo proponer lazy loading/división si el budget realmente falla.
   - Verificar requests públicos a `/_next/static/**/*.js.map` en producción y documentar por qué los `.next/server/*.map` locales no equivalen a exposición pública.

6. **Tests, gates y evidencia**
   - Tests unitarios/integración para headers, seed ausente y budgets cuando sea viable.
   - Smoke tests HTTP para headers, `/api/seed`, páginas privadas sin sesión y rutas especiales.
   - Prueba de navegador real con consola limpia.
   - Gates completos: `npm run test`, `npm run test:coverage`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm audit --audit-level=high`.
   - Verificar build local normal y build Vercel (`VERCEL=1 npm run build`) sin romper standalone Docker.
   - Registrar evidencia en un directorio gitignored existente o proponer una ubicación coherente sin commitear secretos.

## Entregable

Escribí exclusivamente el plan en:

```text
prompts/03-plan-hardening-runtime-predeploy.md
```

El plan debe incluir:

- archivos exactos a crear/modificar/eliminar;
- orden de implementación;
- decisión explícita sobre el reemplazo del seed;
- comandos reproducibles;
- tests nuevos o actualizados;
- método de medición de bundle y budgets;
- estrategia de prueba de consola real;
- criterios de rollback si se rompe el flujo local;
- evidencia requerida para el review final.

## Reglas estrictas

- NO implementes nada.
- NO modifiques `AGENTS.md`, `constitution.md`, `.env*` ni las specs.
- NO agregues dependencias npm por comodidad.
- NO elimines el seed sin planificar primero el reemplazo local.
- NO ocultes errores de consola eliminando logging útil; separá cliente de servidor.
- NO declares que el bundle es “gigante” solo por el total raw: medí JS inicial y gzip.
- NO sobrescribas otros planes: solo `prompts/03-plan-hardening-runtime-predeploy.md`.
- El plan debe poder ejecutarse sin que el ejecutor tenga que decidir qué hacer con `/api/seed`, los budgets o la prueba de consola.
