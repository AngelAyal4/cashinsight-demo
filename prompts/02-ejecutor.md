# Prompt 2 — EJECUTOR (Feature: Presupuestos)

> Pegá este prompt en OpenCode (agente `build`) con tu modelo eficiente.
> El ejecutor implementa archivo por archivo siguiendo el plan del orquestador.
> El PLAN del orquestador que se ejecutó queda documentado en la sección final.

# Rol
Sos el EJECUTOR de código del feature **Presupuestos por categoría** de CashinsightApp. Implementás el plan del orquestador, archivo por archivo, siguiendo las reglas del proyecto y la spec aprobada.

# Reglas del proyecto (CashinsightApp)
- Next.js 16 App Router + TypeScript strict (sin `any`)
- TailwindCSS + Tremor para UI
- Mongoose models con validación y timestamps
- API routes con manejo de errores consistente: `{ error: string }` + HTTP status (400/401/404/500)
- Validación de input con Zod en TODAS las rutas
- Auth en todas las rutas: `getSessionUserId()` → `unauthorizedResponse()` si no hay sesión
- Patrón de rutas: replica EXACTAMENTE el estilo de `src/app/api/goals/route.ts` y `src/app/api/goals/[id]/route.ts`
- Mobile-first responsive, rutas de página en español (como `/perfil`, `/metas`)
- JAMÁS hardcodear secretos — usar `process.env`
- Tests con vitest siguiendo el patrón de `src/test/api-routes.test.ts`

# La spec aprobada
Leé `specs/budgets.md` — es la fuente de verdad del feature (RF1–RF11, criterios de aceptación, out-of-scope). NO salirte del alcance.

# ⛔ Restricciones
- NO rediseñar la arquitectura (seguir el plan del orquestador)
- NO modificar `.env`, `AGENTS.md` ni la `constitution.md`
- NO agregar dependencias nuevas sin justificar en cada caso
- NO hacer commits (el humano revisa antes)
- NO implementar cosas del out-of-scope (recurrencia, rollover, multi-moneda, presupuesto global)

# Formato de trabajo
1. Implementá archivo por archivo según el plan
2. Verificá sintaxis (`npx tsc --noEmit`) después de cada fase
3. Corré los tests después de la fase de API: `npx vitest run`
4. Al final, resumí qué se implementó y cómo verificarlo

# Criterio de entrega
- [ ] Código implementado según el plan y la spec
- [ ] Sin errores de TypeScript strict
- [ ] API routes con auth + Zod + manejo de errores consistente
- [ ] `npx vitest run` pasa (55 tests existentes + los nuevos de budgets)
- [ ] `npm run build` pasa
- [ ] UI responsive (mobile-first), rutas en español, componentes Tremor
- [ ] Sin secretos hardcodeados

---

# PLAN DEL ORQUESTADOR (ejecutado — documentación)

## Fase 1: Modelo, tipos e índices
- **Objetivo:** Completar el modelo Budget y definir el contrato de respuesta con progreso.
- **Archivos:** `src/models/Budget.ts`, `src/types/index.ts`.
- **Detalle técnico:** `amount.min(0.01)` (positivo estricto); validar `endDate >= startDate`; reemplazar el índice `{ category, period }` por `{ category, period, startDate }`; eliminar el índice viejo vía sincronización única (colección sin datos). Tipos `BudgetStatus` y `BudgetProgress` con `usedAmount`, `usagePercent`, `status`.
- **Criterio de hecho:** Se pueden crear presupuestos de la misma categoría y período con distintas fechas de inicio; el modelo rechaza montos no positivos o fechas incoherentes.

## Fase 2: Cálculo agregado de progreso
- **Objetivo:** Cálculo eficiente sin N+1 y filtro de huérfanos.
- **Archivos:** nuevo `src/lib/budget-progress.ts`.
- **Detalle técnico:** `getBudgetsWithProgress()` con UN `Budget.aggregate()`: `$lookup` de transactions (`type: 'expense'`, categoría, fechas inclusivas `[startDate, endDate]`), `$lookup` de categories, `$unwind` de categoría para excluir budgets huérfanos, `$project` con `usedAmount: { $sum: ... }`. `usagePercent` sin límite a 100; estados `sano <80`, `advertencia 80–100`, `excedido >100`. Filtro opcional por vigencia (endDate >= hoy) para dashboard.
- **Criterio de hecho:** Devuelve 0, 40, 80 y >100 correctamente por presupuesto.

## Fase 3: API CRUD
- **Archivos:** nuevos `src/app/api/budgets/route.ts`, `src/app/api/budgets/[id]/route.ts`.
- **Detalle técnico:** patrón de Goals (auth + Zod + connectDB). POST valida categoría existente (404) y `type: 'expense'` (400). PATCH permite `amount`, `period`, fechas con validación de coherencia. POST/PATCH devuelven el presupuesto recalculado. Conflictos de índice único → 409 controlado. DELETE → `{ message }`.
- **Criterio de hecho:** Todas las rutas exigen sesión, `{ error }` consistente, no permiten categorías income, devuelven progreso actualizado.

## Fase 4: Tests de API
- **Archivos:** `src/test/api-routes.test.ts`.
- **Detalle técnico:** `Budget.deleteMany({})` en `cleanDatabase()`. Casos: 401, creación, listado con categoría poblada y progreso, monto inválido, categoría income rechazada, fechas invertidas/formato malo, edición con recálculo 40%→80%, ObjectId inválido, 404, eliminación, transacciones dentro/fuera de rango y de otra categoría, dos períodos con distinto startDate sin colisión.
- **Criterio de hecho:** RF11 y criterios de aceptación pasan.

## Fase 5: Página y formularios
- **Archivos:** nuevos `src/hooks/use-budgets.ts`, `src/app/presupuestos/page.tsx`, `src/components/budgets/budget-card.tsx`, `src/components/budgets/budget-form-modal.tsx`.
- **Detalle técnico:** patrón `use-goals` (AbortController, loading/error/retry). Form: categorías solo `expense`, reutiliza `Modal` y `MoneyInput`, generación local de fechas por período (semana: lunes-domingo; mes: 1°-último; año: ene-dic). Cards con icono/color, fechas, "gastado de", %, excedente. `ProgressBar` Tremor limitada visualmente a 100 con colores por estado.
- **Criterio de hecho:** Página responsive, accesible, CRUD sin recargar, excedido muestra barra roja y excedente.

## Fase 6: Dashboard, navegación e integración
- **Archivos:** `src/app/api/reports/summary/route.ts`, `src/app/page.tsx`, `src/components/layout/app-header.tsx`, `src/types/index.ts`.
- **Detalle técnico:** `budgets` en `DashboardStats`, obtenidos en el `Promise.all` con `activeOnly`. Widget compacto bajo stat-cards con link a `/presupuestos`. Nav agregada en desktop y móvil. Formateo con `baseCurrency` del perfil.
- **Criterio de hecho:** Dashboard muestra solo vigentes, `/presupuestos` en ambos menús, pasan `npm run lint` y `npm run build`.