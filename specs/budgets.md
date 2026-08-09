---
name: budgets
description: "Spec del feature Presupuestos — límites de gasto por categoría con progreso automático."
---

# SPEC — Presupuestos por categoría (budgets)

> Estado: APROBADA para planificar. Flujo SDD: Constitution → Specify → Plan → Tasks → Implement.

## 1. Problema
La app registra ingresos, gastos y metas, y el dashboard muestra el balance mensual, pero **no hay límites de gasto por categoría**. El usuario no tiene forma de responder "¿me estoy pasando en Comida este mes?" hasta que ya pasó. La única referencia de control es el `variableExpenses` del perfil financiero, que es un límite global, no por categoría.

## 2. Solución propuesta
Módulo **Presupuestos**: límite de gasto por categoría con un período de vigencia. El sistema calcula automáticamente el progreso cruzando las transacciones `expense` de la categoría contra el monto presupuestado, y la UI lo muestra con barras de progreso coloreadas por estado (sano / advertencia / excedido).

Piezas:
1. **Modelo `Budget`** — ya existe como esqueleto en `src/models/Budget.ts`; se corrige el índice y se valida.
2. **API `/api/budgets`** — CRUD con el patrón de la app (Zod + `getSessionUserId` + `connectDB`).
3. **API `/api/budgets/[id]`** — PATCH/DELETE con validación de ObjectId.
4. **Utilidad `getBudgetsWithProgress()`** — cruza Budget ↔ Transaction (aggregate) y devuelve `usedAmount` + `usagePercent` + estado.
5. **Página `/presupuestos`** — tarjetas por categoría con barra Tremor + modales de crear/editar (reutilizando `Modal`, `MoneyInput`).
6. **Widget en dashboard** — presupuestos activos con mini-barras bajo los stat-cards.

## 3. Usuarios afectados
Único usuario (single-user, auth JWT). Es el usuario dueño de la app gestionando su presupuesto personal mensual.

## 4. Flujos de usuario
1. **Crear**: `Nuevo presupuesto` → elijo categoría de gasto (solo `type: 'expense'`) → monto → período (semanal/mensual/anual) → guardar.
2. **Ver progreso**: entro a `/presupuestos` → veo cada categoría con "gastado $X de $Y" y barra de progreso (verde <80%, amarillo 80–100%, rojo >100% con excedente).
3. **Editar**: edito el monto de un presupuesto → el % se recalcula al instante (lo devuelve la API).
4. **Eliminar**: borro un presupuesto → desaparece la tarjeta y el widget del dashboard.
5. **Dashboard**: en home veo los presupuestos vigentes (endDate >= hoy) con su barra compacta.

## 5. Requisitos funcionales
- [ ] RF1: `GET /api/budgets` devuelve todos los presupuestos con categoría poblada (`name`, `color`, `icon`) y progreso calculado.
- [ ] RF2: `POST /api/budgets` crea un presupuesto validado con Zod: `{ category (ObjectId), amount (>0), period ('weekly'|'monthly'|'yearly'), startDate, endDate }`.
- [ ] RF3: La categoría de un presupuesto debe existir y ser `type: 'expense'` (401/400 si no).
- [ ] RF4: `PATCH /api/budgets/[id]` permite editar `amount`, `period`, fechas; valida ObjectId y 404 si no existe.
- [ ] RF5: `DELETE /api/budgets/[id]` elimina; 404 si no existe.
- [ ] RF6: El progreso se calcula sobre el rango real `[startDate, endDate]` del presupuesto: `usedAmount = Σ amount de Transaction type:'expense' con category y date ∈ rango`; `usagePercent = (usedAmount / amount) × 100`; estado: `sano` (<80), `advertencia` (80–100), `excedido` (>100).
- [ ] RF7: La respuesta del GET incluye por presupuesto: `_id, category (poblada), amount, period, startDate, endDate, usedAmount, usagePercent, status`.
- [ ] RF8: Página `/presupuestos` (layout con `AppHeader`, rutas en español como `/perfil`, `/metas`).
- [ ] RF9: Modal de crear/editar reutiliza `Modal` + `MoneyInput` + selector de categorías de gasto.
- [ ] RF10: Dashboard: presupuestos activos (endDate >= hoy) con barra compacta bajo los stat-cards.
- [ ] RF11: Tests de API routes para budgets (mismo patrón que `src/test/api-routes.test.ts`): crear, listar con progreso, editar, eliminar, 404, validación Zod, categoría no-expense rechazada.

## 6. Requisitos no funcionales
- **Seguridad**: todas las rutas exigen sesión (`getSessionUserId` → 401). Validación de input con Zod (patrón existente). Sin secretos.
- **Performance**: el GET de budgets usa un solo `aggregate` de Mongo (no N+1 queries por presupuesto).
- **Consistencia**: respuestas de error `{ error: string }` con HTTP status (400/401/404/500), igual que goals/transactions.
- **UI**: mobile-first con Tailwind, componentes Tremor (barra de progreso), accesible (labels, aria en modales).
- **Testeo**: cobertura de la nueva lógica en `src/app/api/budgets/**` (vitest, umbral 70% ya configurado).

## 7. Criterios de aceptación
- [ ] Dado un presupuesto de $1000 en Comida (vigente este mes) y $400 en gastos de Comida en el rango, cuando consulto `GET /api/budgets`, entonces `usedAmount=400`, `usagePercent=40`, `status='sano'`.
- [ ] Dado un presupuesto de $1000 en Comida y $1200 gastados en el rango, cuando consulto el GET, entonces `status='excedido'` y la UI muestra la barra en rojo con el excedente.
- [ ] Dado que intento crear un presupuesto con categoría `Sueldo` (income), cuando hago POST, entonces la API responde 400 y no se crea el documento.
- [ ] Dado que edito el monto de $1000 a $500, cuando hago PATCH, entonces el GET devuelve `usagePercent` recalculado (80 si gasté $400).
- [ ] Dado que elimino un presupuesto, cuando hago DELETE, entonces responde `{ message }` y el GET ya no lo incluye.
- [ ] Dado que no hay sesión, cuando llamo a cualquier ruta de budgets, entonces responde 401.
- [ ] Dado que creo un presupuesto con `amount: -5`, cuando hago POST, entonces responde 400 por validación Zod.

## 8. Dependencias
- Modelos `Category` y `Transaction` existentes (con `type: 'expense'` y `date`).
- `src/models/Budget.ts` (esqueleto — requiere fix de índice y validación).
- Patrones: `zod` schemas, `getSessionUserId`/`unauthorizedResponse` (`src/lib/auth.ts`), `connectDB` (`src/lib/db.ts`).
- UI: `Modal`, `MoneyInput` (`src/components/ui/`), `AppHeader` (`src/components/layout/`).
- Tests: patrón de `src/test/api-routes.test.ts` (mock de `next/headers`, `cookieJar`, MongoDB real en Docker).

## 9. Riesgos / Incertidumbres
- **Índice único actual** `{ category: 1, period: 1 }` impide presupuestos por mes de la misma categoría (enero vs febrero). Fix propuesto: índice `{ category: 1, period: 1, startDate: 1 }` — decidir en planificación si se elimina el viejo (colección sin datos en prod, migración trivial o nula).
- El período (`weekly|monthly|yearly`) es informativo para la vigencia; el cálculo de progreso SIEMPRE usa `[startDate, endDate]` reales. Definir cómo el frontend autogenera las fechas por período elegido (ej: monthly → 1er día del mes actual al último día).
- Al eliminar una categoría con presupuestos asociados no debe romper el GET (los budgets huérfanos se filtran o se eliminan en cascada).
- Los tests corren contra MongoDB real (Docker): el container debe estar levantado (`docker compose up -d`).

## 10. Out of Scope (explícito)
- Recurrencia automática (clonar presupuesto mes a mes) — el usuario crea/edita la vigencia manualmente.
- Rollover de sobrante ("lo que no gasté pasa al mes siguiente").
- Multi-moneda por presupuesto (usa `baseCurrency` del perfil, como el resto de la app).
- Presupuesto global único (solo por categoría).
- Crear categorías nuevas desde el modal de presupuesto (se crean en `/categorías` o seed).
- Notificaciones/alarmas por umbral superado.
