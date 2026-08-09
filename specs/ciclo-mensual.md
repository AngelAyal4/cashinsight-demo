---
name: ciclo-mensual
description: "Spec del cierre mensual (rollover) + snapshot — la base de datos de todo el nuevo modelo. Sin esto, report/control/principal no funcionan."
---

# SPEC — Ciclo Mensual (rollover + snapshot)

> Estado: APROBADA para planificar. Esta es la FASE 0 — las specs de report, control, principal y help dependen de ella.

## 1. Problema
Hoy la app acumula transacciones y límites sin fin: el dashboard muestra "el mes actual" pero nada se cierra, el mes pasado se mezcla con el presente, y no existe historial compactado. El usuario quiere un ciclo mensual real: al llegar el día 01, el mes anterior se **compacta** (nunca se borra) y el mes nuevo arranca en cero.

## 2. Solución propuesta
Mecanismo de **lazy rollover**: en el primer request de la app de un mes nuevo, se dispara una función que:
1. **Compacta** el mes anterior en un `MonthlySnapshot` (totales por categoría, ingresos, gastos fijos/variables, ahorros, cumplimiento de límites, score financiero).
2. **Marca las transacciones** del mes anterior como `archived: true` (el detalle queda en DB pero no se muestra en ninguna vista activa).
3. **Regenera el estado activo**: el mes actual arranca sin transacciones activas; los límites de Control **persisten** (no se regeneran).
4. Es **idempotente**: dos requests simultáneos no generan doble snapshot (índice único por mes + guard).

## 3. Usuarios afectados
Único usuario (single-user, auth JWT). El rollover corre automáticamente sin interacción.

## 4. Flujos de usuario
1. **Cambio de mes (automático)**: el 01/09 el usuario abre la app → el primer request detecta `now.month > activeMonth` → compacta agosto en snapshot → agosto deja de aparecer en el dashboard → septiembre arranca con los límites de Control intactos.
2. **Nuevo mes, misma config**: los límites que el usuario definió en agosto siguen en Control para septiembre; solo el progreso de gasto arranca en cero.

## 5. Requisitos funcionales
- [ ] RF1: Función `runMonthlyRollover()` en `src/lib/monthly-cycle.ts` que compara la fecha actual contra el "mes activo" guardado (en `FinancialProfile` o colección de estado).
- [ ] RF2: Al detectar mes nuevo: genera `MonthlySnapshot` del mes anterior con: `monthKey` (YYYY-MM), `income`, `expensesByCategory` (agrupadas, con fijo/variable), `totalFixed`, `totalVariable`, `savings`, `budgetCompliance` (por límite: amount, used, percent, status), `financialScore` + `scoreMessage`, `totalTransactions`, fechas del rango.
- [ ] RF3: Marca las transacciones del mes anterior con `archived: true` (NO se borran; `Transaction.find({ archived: { $ne: true } })` en toda consulta activa).
- [ ] RF4: Los límites de Control NO se tocan (persisten tal cual).
- [ ] RF5: Idempotencia: índice único en `MonthlySnapshot.monthKey` + manejo de error 11000 (si ya existe, el segundo request no falla ni duplica).
- [ ] RF6: El estado "mes activo" se guarda (campo `activeMonth: 'YYYY-MM'` en `FinancialProfile`) y se actualiza tras el rollover.
- [ ] RF7: El rollover se ejecuta dentro de `connectDB()` o en un helper llamado por todas las API routes activas (una sola fuente).
- [ ] RF8: Nuevo modelo `MonthlySnapshot` (`src/models/MonthlySnapshot.ts`).
- [ ] RF9: Campo `archived` agregado al schema de `Transaction` (default `false`).
- [ ] RF10: Tests: rollover con mes viejo → snapshot creado + transacciones archivadas + límites intactos; doble rollover → sin duplicado; sin cambio de mes → no hace nada.

## 6. Requisitos no funcionales
- **Idempotencia**: el rollover debe ser seguro de correr N veces.
- **Performance**: el snapshot se genera con agregaciones de Mongo (no cargar todas las transacciones a memoria).
- **Seguridad**: el rollover solo corre con sesión válida (no es un endpoint público).
- **Testeo**: cobertura ≥70% de `src/lib/monthly-cycle.ts` (umbral ya configurado en vitest).

## 7. Criterios de aceptación
- [ ] Dado que el mes activo es agosto y la fecha actual es 01/09, cuando corre el rollover, entonces existe un `MonthlySnapshot` de 2026-08 con totales correctos y las transacciones de agosto están `archived: true`.
- [ ] Dado que el rollover ya corrió para septiembre, cuando vuelve a correr en el mismo request, entonces no genera un segundo snapshot (sin error).
- [ ] Dado que el usuario tiene límites de Control, cuando corre el rollover, entonces los límites siguen existiendo intactos.
- [ ] Dado que no cambió el mes, cuando corre el rollover, entonces no hace nada (no toca nada).

## 8. Dependencias
- `src/models/FinancialProfile.ts` (agregar `activeMonth`).
- `src/models/Transaction.ts` (agregar `archived`).
- `src/lib/db.ts` (invocar el rollover post-conexión).
- `getBudgetsWithProgress()` (para el cumplimiento del snapshot) — ya existe.
- `getGoalsWithProgress()` (para ahorros del snapshot) — ya existe.

## 9. Riesgos / Incertidumbres
- **Rollover en medio de un request**: debe correr antes de que las queries activas lean datos (o al menos antes de que escriban). Decidir si corre en `connectDB()` (más simple, corre para todos) o en un helper por ruta.
- **Concurrencia**: dos requests simultáneos el 01/09 → ambos ven mes viejo → ambos intentan snapshot → el índice único + catch de 11000 resuelve.
- **Zona horaria**: el "día 01" depende del timezone del usuario (Argentina, GMT-3). El mes activo se calcula con `Intl.DateTimeFormat` con timezone del navegador/server local — decidir en planificación.
- **Transacciones atrasadas**: si el usuario registra una transacción con fecha de agosto cuando ya se cerró septiembre, ¿se archiva en el momento? Propuesta: toda transacción con fecha < mes activo se archiva automáticamente al crearse (regla de consistencia).

## 10. Out of Scope (explícito)
- Borrar datos (el archivo es permanente; el borrado de cuenta sí elimina todo, pero es acción explícita del usuario).
- Cron externo / programador de tareas (el lazy rollover es suficiente).
- Exportar datos.
- Compresión/reducción de snapshots viejos (todos se conservan).
