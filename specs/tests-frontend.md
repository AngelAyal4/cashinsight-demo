---
name: spec-tests-frontend
description: "Spec aprobada: tests de componentes (frontend) con Testing Library + jsdom para CashinsightApp."
---

# SPEC — Tests de componentes (frontend)

## 1. Problema
La suite actual tiene **84 tests** (Vitest) que cubren `lib/`, `proxy` y las API routes, pero **cero componentes de UI**. Regresiones de lógica visual — estados de presupuesto (sano/alerta/excedido), sanitización de montos, flujos de confirmación de borrado, renders con estados vacíos — no se detectan automáticamente. Es el único hueco de calidad del proyecto (listado como pendiente en *Criterios de Éxito*).

## 2. Solución propuesta
Agregar **Testing Library + jsdom** a la infraestructura Vitest existente y escribir tests unitarios de componentes (`*.test.tsx`) para los componentes de mayor valor. Los tests de API existentes **no se modifican**: corren en `environment: 'node'` (comportamiento actual) y los de componentes declaran `// @vitest-environment jsdom` por archivo.

## 3. Usuarios afectados
- **Desarrollador** (principal): detecta regresiones de UI en cada cambio.
- **Usuario final** (indirecto): menos bugs en control de gastos, movimientos y reportes.

## 4. Flujos de usuario
1. Desarrollador corre `npm test` → se ejecutan los 84 tests existentes + los nuevos de componentes → falla temprana ante regresión de UI.
2. Desarrollador corrige un componente → el test asociado valida el comportamiento esperado sin levantar el navegador.

## 5. Requisitos funcionales
- [ ] **RF1** Instalar devDeps: `@testing-library/react` (v16+, compat React 19), `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`. Usar `--legacy-peer-deps` si hace falta (`.npmrc` ya lo fija).
- [ ] **RF2** Configurar Vitest para incluir `src/**/*.test.tsx` **sin cambiar** `environment: 'node'` global: los tests de componentes usan `// @vitest-environment jsdom` per-file.
- [ ] **RF3** Setup compartido con mocks jsdom-safe: `ResizeObserver`, `window.matchMedia` y `HTMLElement.prototype.getBBox` (para Tremor/Recharts). Debe ser inofensivo en `node` (los tests de API usan el mismo `setupFiles`).
- [ ] **RF4** `MoneyInput`: coma → punto, filtra no numéricos, evita múltiples puntos, clamp `min`/`max`, `onChange(0)` ante NaN.
- [ ] **RF5** `StatCard` + `StatCardSkeleton`: render de label y value.
- [ ] **RF6** `BudgetProgressBar`: color según estado (emerald/amber/rose) y value truncado a 100.
- [ ] **RF7** `BudgetCard`: chip Sano/En alerta/Excedido, texto "Excedente" solo si excedido, flujo Eliminar → confirmación → Sí llama `onDelete` / No cancela, `onEdit` llama callback.
- [ ] **RF8** `reports-empty-state` y `reports-detail` con snapshot mínima: render sin crash y datos visibles (balance, categorías).
- [ ] **RF9** `client-section`: renderiza children.
- [ ] **RF10** `movements-list`: render de items, callbacks editar/eliminar.
- [ ] **RF11** Al menos un modal de metas (`goal-create-modal`): apertura, validación y submit.
- [ ] **RF12** Íconos (`category-icon`, `avatar-icon`): render sin crash con nombre conocido y desconocido.
- [ ] **RF13** `app-header`: links de navegación y clase del link activo (mockear `next/navigation`).
- [ ] **RF14** `src/lib/format.ts` se agrega al `include` de coverage (lógica pura, alta cobertura esperada).

## 6. Requisitos no funcionales
- Performance: la suite completa corre < 30 s (jsdom por archivo, sin levantar navegador ni servidor).
- Determinismo: sin timers flaky, sin red, sin Mongo para los tests de componentes.
- Aislamiento: los tests de componentes no requieren MongoDB (los de API sí, como hoy).
- Accesibilidad: asserts por rol/texto visible (no por clase), favoreciendo consultas Testing Library recomendadas.

## 7. Criterios de aceptación
- [ ] Dado `npm test`, cuando corro la suite, entonces los 84 tests previos + los nuevos pasan, sin errores de environment.
- [ ] Dado `MoneyInput`, cuando escribo `12,5`, entonces `onChange` recibe `12.5` y el input muestra `12.5`.
- [ ] Dado `BudgetCard` con `status: 'excedido'`, cuando renderizo, entonces se ve "Excedido" y "Excedente: …".
- [ ] Dado `BudgetCard`, cuando hago click en Eliminar y luego en No, entonces `onDelete` NO se llama; al clickear Sí, se llama una vez.
- [ ] Dado un componente con `ProgressBar` de Tremor, cuando renderizo en jsdom, entonces no falla por falta de `ResizeObserver`/`matchMedia`.
- [ ] Dado `reports-detail` sin datos, cuando renderizo, entonces se ve el estado vacío sin crash.
- [ ] Dado `npm run test:coverage`, cuando corro, entonces los thresholds actuales (70%) siguen pasando sin degradar el include vigente excepto el agregado de `format.ts`.

## 8. Dependencias
- Vitest 4.1.10 + `@vitest/coverage-v8` (ya instalados).
- React 19 + `@testing-library/react` v16+ (requiere soporte React 19).
- El resto de la app (componentes existentes, `src/lib/format.ts`, `next/navigation` para `app-header`).

## 9. Riesgos / Incertidumbres
- **Tremor/Recharts en jsdom**: necesitan mocks (`ResizeObserver`, `matchMedia`, a veces `getBBox`). Mitigación: mocks en el setup compartido, probados antes de escribir el resto.
- **Vitest 4**: `configLoader: 'native'` avisa sobre ESM/CJS en `vitest.config.ts`; no bloquea, pero el ejecutor debe validar que el comentario `@vitest-environment jsdom` funcione en la versión instalada (si no, usar `environmentMatchGlobs` o workspace).
- **Coverage**: agregar componentes grandes al `include` puede hacer caer los thresholds al 70%. Mitigación: solo se agrega `format.ts`; los componentes quedan fuera del gate de cobertura (los tests son adicionales, no obligatorios por porcentaje).
- **`app-header` con `usePathname`**: requiere mock de `next/navigation`.

## 10. Out of Scope (explícito)
- **NO** E2E (Playwright/Cypress).
- **NO** visual regression testing (snapshots de imágenes).
- **NO** tests de páginas completas (App Router con Server Components).
- **NO** cobertura forzada sobre componentes (solo `format.ts` entra al include).
- **NO** modificar tests existentes salvo que algo rompa por el cambio de config.