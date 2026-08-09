---
name: spec-gastos-pareja
description: "Spec aprobada: balance de gastos de pareja (responsable + neto mensual + liquidaciones) dentro de la cuenta única."
---

# SPEC — Gastos de pareja (balance compartido liviano)

## 1. Problema
La pareja del usuario usa la misma cuenta (single-user local). Hoy no hay forma de saber **quién pagó cada gasto** ni cuánto debe cada uno al cierre del mes. Convivir con gastos compartidos sin eso genera confusión ("¿vos pusiste la expensa o yo?").

## 2. Solución propuesta
Agregar un campo opcional `paidBy` a las transacciones de gasto (`yo` | `pareja` | `compartido`), un **balance de pareja mensual** calculado en el resumen del mes activo, y **liquidaciones manuales** (tipo de transacción `settlement`) que saldan la deuda sin tocar el presupuesto.

**Decisión de producto (cerrada):** modelo **flexible + informativo** — cada uno paga lo que paga, `compartido` se divide 50/50 a efectos del balance, y el neto es informativo. **NO** hay split porcentual por transacción, **NO** hay deudas automáticas.

## 3. Usuarios afectados
- Único usuario local + la pareja que comparte la cuenta. Los dos ven y cargan con el mismo login (no cambia el modelo de usuarios).

## 4. Flujos de usuario
1. El usuario (o su pareja) carga un gasto del hogar → elige "¿Quién pagó?" (Vos / Pareja / Compartido). Si no elige, el gasto no participa del balance (comportamiento de hoy).
2. En el resumen del mes activo ve el **Balance de pareja**: cuánto puso cada uno y el neto ("Tu pareja te debe $2.500" / "Le debés $2.500" / "Saldado").
3. Cuando la pareja transfiere el monto, el usuario carga una **Liquidación** (tipo nuevo, no cuenta como ingreso ni gasto) → el balance vuelve a cero. El historial queda registrado.

## 5. Requisitos funcionales
- [ ] **RF1** Modelo `Transaction`: campo opcional `paidBy: 'yo' | 'pareja' | 'compartido' | null` (default `null`). Valorable SOLO en transacciones tipo `expense`; para los demás tipos se rechaza con 400 o se ignora (definir: rechazo con 400, explicit state).
- [ ] **RF2** Tipo nuevo `'settlement'` en el enum `type` (aditivo — los valores existentes siguen intactos):
  - Requerido: `amount > 0`, `paidBy` (`'yo'` = "yo recibí", `'pareja'` = "mi pareja recibió"), `description`.
  - NO requiere categoría ni goal (los requerimientos condicionales actuales se ajustan para excluir `settlement`).
  - **NO cuenta** en ingresos/gastos/ahorro del resumen mensual: queda excluida de `totalIncome`, `totalExpense`, `totalFixed`, `totalVariable`, `availableToSpend`, `perDayRemaining`, `savingsRate`, score y donut. Solo existe para el balance.
- [ ] **RF3** Balance de pareja en `GET /api/reports/summary` (campo nuevo aditivo, el resto del contrato no cambia):
  - `coupleBalance: { paidByMe, paidByPartner, net, status }` con:
    - `paidByMe` = Σ gastos `paidBy: 'yo'` + 50% de gastos `'compartido'`
    - `paidByPartner` = Σ gastos `'pareja'` + 50% de gastos `'compartido'`
    - `net` = `paidByMe - paidByPartner` (> 0 → la pareja te debe; < 0 → le debés)
    - `status: 'te-deben' | 'debes' | 'saldado'`
  - Las liquidaciones del mes **restan del neto** (dirección según `paidBy`) para que el balance refleje el saldo real.
  - Solo mes activo (el balance NO entra al snapshot histórico — fuera de alcance).
- [ ] **RF4** Crear/editar transacción: el schema Zod de `POST /api/transactions` y `PATCH /api/transactions/[id]` acepta `paidBy` opcional (mismo `z.enum(['yo','pareja','compartido']).nullable().optional()`); `type: 'settlement'` validado con sus reglas (RF2).
- [ ] **RF5** UI — form de movimiento (`movement-form`): cuando `type === 'expense'`, mostrar el selector "¿Quién pagó?" (Vos / Pareja / Compartido) con estética brutalista existente. Para el resto de los tipos, el form se ve idéntico a hoy.
- [ ] **RF6** UI — resumen del mes activo (Principal): bloque "Balance de pareja" (estilo card-brutal) con aportes, neto y botón "Liquidar" que abre el form pre-cargado (`type: settlement`, monto sugerido = |net|, dirección según `status`).
- [ ] **RF7** Edición de una transacción existente con `paidBy`: el form detecta el valor actual y lo muestra; al guardar sin cambios no altera nada.
- [ ] **RF8** Tests aditivos (nuevo `src/test/couple-balance.test.ts` o dentro de api-routes):
  - Matriz de balance: combinaciones de `yo`/`pareja`/`compartido` con montos → neto correcto (incluyendo 50/50).
  - `settlement`: excluida del resumen (totales no cambian) y ajusta el neto en la dirección correcta.
  - Validación Zod: `paidBy` en `income`/`saving`/`withdrawal` → 400; `settlement` sin `paidBy` → 400; montos ≤ 0 → 400.
  - Regresión: las transacciones sin `paidBy` se comportan exactamente igual (los 153 tests actuales pasan sin modificación).

## 6. Requisitos no funcionales
- **Regresión 0**: ningún cambio al comportamiento de transacciones sin `paidBy` (default `null`).
- El snapshot mensual (MonthlySnapshot) **NO se toca**: el balance de pareja es del mes activo solamente.
- Names: API en inglés (`coupleBalance`, `paidBy`); UI en español rioplatense ("¿Quién pagó?", "Balance de pareja", "Liquidar").
- Sin dependencias npm nuevas.

## 7. Criterios de aceptación
- [ ] Dado un gasto sin `paidBy`, cuando creo/edito/borro, entonces el flujo y el resumen son idénticos a antes del cambio.
- [ ] Dado un gasto `expense` con `paidBy: 'yo'` de $10.000 y uno `'pareja'` de $6.000, cuando pido el summary, entonces `coupleBalance.net === 4000` y `status === 'te-deben'`.
- [ ] Dado un gasto `'compartido'` de $10.000, cuando pido el summary, entonces `paidByMe === 5000` y `paidByPartner === 5000`.
- [ ] Dado una liquidación de $4.000 con `paidBy: 'yo'`, cuando pido el summary, entonces el neto anterior se reduce en 4.000 y `totalIncome`/`totalExpense` no cambian (excluida del presupuesto).
- [ ] Dado `type: 'settlement'` sin `paidBy` o con monto ≤ 0, cuando creo la transacción, entonces 400.
- [ ] Dado `paidBy` en una transacción `income`, cuando creo la transacción, entonces 400.
- [ ] Dado la suite completa, cuando corro `npm test`, entonces 153 + nuevos pasan.
- [ ] Dado `npm run lint`, `npx tsc --noEmit` y `npm run build`, cuando corro, entonces sin errores.

## 8. Dependencias
- Modelo `Transaction` (+1 campo), enum `type` (+1 valor), schema Zod de transactions (+campo), summary route (+1 bloque de cálculo), movimiento del form (+selector), Principal (+bloque). Sin dependencias npm.

## 9. Riesgos / Incertidumbres
- **El enum `type` con `settlement`**: revisar todos los usos de `type` (filtros del summary, donut, movimientos, validaciones) para excluir `settlement` de los agregados. La spec lo exige explícitamente (RF2/RF3).
- **Requerimientos condicionales de categoría/goal en el modelo**: hoy `category` es requerida salvo saving/withdrawal; `settlement` debe sumarse a esa excepción (o el schema Zod lo controla solo — definir en implementación, pero el resultado final: crear settlement sin categoría funciona).
- **UI del form**: el selector agrega una fila solo en `expense`; no debe cambiar el layout para los otros tipos (regresión visual 0).
- **Liquidaciones parciales**: se permiten (el neto no tiene que quedar exacto en cero) — documentarlo en la UI con texto "Si el monto no es exacto, el balance queda con el saldo restante".

## 10. Out of Scope (explícito)
- **NO** split porcentual por transacción ni deudas automáticas (decisión de producto: flexible + informativo).
- **NO** balance histórico en snapshots ni comparativa entre meses del balance de pareja.
- **NO** multi-usuario / workspaces / invitaciones (requiere cambiar la constitution y re-arquitecturar el modelo de datos — proyecto aparte para después de producción).
- **NO** notificaciones de balance ni recordatorios de liquidación.
- **NO** separación de presupuestos por persona (el presupuesto es UNO del hogar).