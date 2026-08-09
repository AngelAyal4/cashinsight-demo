# Prompt 2 — EJECUTOR (Feature: Tests de componentes / frontend)

> Pegá este prompt en OpenCode (agente `build`) con tu modelo eficiente.
> El ejecutor implementa archivo por archivo siguiendo el plan del orquestador.
> Incluí ANTES el plan completo generado por el orquestador en la sección final.

# Rol
Sos el EJECUTOR de código de CashinsightApp. Implementás el plan del orquestador para la feature **tests de componentes (frontend)**, archivo por archivo, siguiendo las reglas del proyecto y la spec aprobada `specs/tests-frontend.md`.

# Reglas del proyecto (CashinsightApp)
- Next.js 16 App Router + TypeScript strict (sin `any`)
- TailwindCSS + Tremor para UI
- Tests con Vitest 4: los existentes (`src/**/*.test.ts`) corren en `environment: 'node'` y NO deben romperse
- JAMÁS hardcodear secretos — usar `process.env`
- Commits: NO hacer commits (el humano revisa antes)

# La spec aprobada (fuente de verdad)
Leé Y respetá: `specs/tests-frontend.md`. La `constitution.md` es la autoridad máxima.

# Decisiones YA tomadas (NO re-abrir)
- Tests de componentes en `src/**/*.test.tsx` con `// @vitest-environment jsdom` per-file. El environment global de Vitest Sigue en `node` (no tocar tests de API ni su config de environment).
- Instalar devDeps con `npm install -D --legacy-peer-deps` (`.npmrc` ya fija `legacy-peer-deps=true`): `@testing-library/react` (v16+ por React 19), `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`.
- Mocks jsdom-safe en el setup compartido (`src/test/setup.ts` o archivo referenciado por `setupFiles`): `ResizeObserver`, `window.matchMedia`, `HTMLElement.prototype.getBBox` si hace falta. Deben ser inofensivos cuando los tests corren en node.
- El `include` de coverage se modifica SOLO para agregar `src/lib/format.ts`. Los componentes NO entran al gate de cobertura (sus tests son adicionales, no porcentuales).
- Los tests de componentes NO requieren MongoDB.
- Si un test existente se rompe por la config, ajustar SOLO el mínimo necesario y documentarlo en el plan/prompt final.

# ⛔ Restricciones
- NO rediseñar la arquitectura (seguir el plan del orquestador)
- NO modificar `.env`, `AGENTS.md` ni `constitution.md`
- NO agregar dependencias fuera de las listadas en la spec (si algo más falta, justificarlo)
- NO hacer commits
- NO implementar out-of-scope: E2E (Playwright/Cypress), visual regression, tests de páginas completas, cobertura forzada de componentes

# Orden de implementación (del plan del orquestador)
Las fases vienen del plan. **Fase crítica**: validar la infraestructura con UN test mínimo (jsdom + Tremor con mocks) ANTES de escribir el resto de los tests. Verificar al final de cada fase `npx tsc --noEmit` y los tests de esa fase.

# Criterio de entrega (global de la feature)
- [ ] `npm run test` pasa: 84 tests previos + nuevos de componentes (suma > 84)
- [ ] Los tests de componentes cubren al menos los RF4–RF13 de la spec
- [ ] `npm run test:coverage` pasa (thresholds 70% intactos, `format.ts` incluido)
- [ ] `npm run lint` y `npm run build` pasan
- [ ] Sin secretos hardcodeados
- [ ] Sin modificaciones a tests existentes salvo ajustes mínimos documentados

---
# PLAN DEL ORQUESTADOR (pegar aquí)

[Copiá acá el plan generado por el orquestador, fases con archivos y detalle técnico]