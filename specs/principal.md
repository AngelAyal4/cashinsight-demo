---
name: principal
description: "Spec de la página Principal (/): presupuesto general del usuario — ingresos, gastos fijos y variables + indicadores de gestión."
---

# SPEC — Página Principal (presupuesto general)

> Estado: APROBADA para planificar. DEPENDE de `specs/ciclo-mensual.md` (los datos activos son del mes en curso y los viejos se archivan) y de `specs/control.md` (los límites de control alimentan indicadores).

## 1. Problema
El dashboard actual mezcla todo: tarjetas de balance, movimientos recientes, widget de límites, metas. El usuario quiere que la página Principal sea el **centro de decisiones del mes**: ingresos ingresados, gastos fijos y variables, y **indicadores que le digan cómo manejar su dinero** (cuánto le queda, cuánto puede gastar por día, si está en camino a su ahorro objetivo).

## 2. Solución propuesta
Rediseñar `/` como el **panel de presupuesto general mensual**:

1. **Header mensual**: "Agosto 2026" + balance del mes (ingresos − gastos) + score financiero con mensaje.
2. **Sección Ingresos**: sueldo/ingresos del mes + quick-add (mantener registro de ingresos).
3. **Sección Gastos**:
   - **Fijos** (alquiler, servicios...): total mensual (editable en Perfil o directamente acá).
   - **Variables** (ocio, comida...): la suma del mes + mini-barras de los límites de Control activos.
4. **Indicadores (stat cards)**:
   - **Disponible para gastar** = ingresos − gastos fijos − gastos variables ya registrados.
   - **Per-día restante** = disponible / días que quedan del mes.
   - **Tasa de ahorro** = (ahorro registrado / ingresos) × 100.
   - **Salud financiera**: el `financialScore` + `scoreMessage` (ya calculado).
5. **Movimientos recientes** (se mantiene, scroll contextual).

## 3. Usuarios afectados
Único usuario, el flujo diario de la app.

## 4. Flujos de usuario
1. **Abrir la app**: veo el mes actual, mi balance, cuánto puedo gastar y por día.
2. **Ingresar un gasto**: registro un gasto variable → la sección variables y el "disponible" se actualizan al instante; si supera un límite de Control, la barra se pone en alerta.
3. **Definir fijos**: asigno mis gastos fijos del mes (o los dejo venir de Perfil) → el disponible recalcula solo.
4. **Ver mi salud**: miro el score + mensaje y la tasa de ahorro para decidir si sigo gastando este mes.

## 5. Requisitos funcionales
- [ ] RF1: El summary (`GET /api/reports/summary`) ya devuelve `income`, `expenses`, `savings`, `budgets`, `goals`, `score`: REUSAR sin cambios mayores (la página consume lo que ya hay).
- [ ] RF2: Nuevos indicadores calculados donde corresponda:
  - `availableToSpend` = income − fixedExpenses − expenses(variables registradas)
  - `perDayRemaining` = availableToSpend / días restantes del mes (incluye hoy; 0 si mes terminó)
  - `savingsRate` = savings / income × 100
  - (NOTA: si income month aún no cargado de `monthlyIncome` del perfil, mostrar "cargá tus ingresos" como primer paso)
- [ ] RF3: La sección Ingresos quick-add reactiva las tarjetas sin recargar.
- [ ] RF4: La sección Variables usa los límites de Control activos (widget existente "Presupuestos activos") + total de gastos variables del mes.
- [ ] RF5: Primer uso / estado vacío: si no hay ingresos cargados, la página guía al usuario a cargarlos (CTA).
- [ ] RF6: Movimientos recientes y formulario de carga se mantienen (regresión cero).
- [ ] RF7: Tests: cálculo de `availableForDay`, `savingsRate` con casos borde (income 0, fin de mes, día 1).

## 6. Requisitos no funcionales
- **Performance**: un solo fetch del summary (ya es un solo aggregate).
- **UI**: helper brutalis, jerarquía clara (ingresos → fijos → variables → indicadores → movimientos).
- **Accesibilidad**: los indicadores son texto + color (no solo color).

## 7. Criterios de aceptación
- [ ] Dado ingresos de $300k y gastos variables de $120k con $50k de fijos, cuando veo Principal, entonces `availableForSpend = 130k`, `savingsRate` correcta, `perDay` = 130k/días restantes.
- [ ] Dado un mes con income 0, cuando veo Principal, entonces la página me guía a cargar mi ingreso (no muestra números fantasma).
- [ ] Dado que registro un gasto nuevo, cuando retorno, entonces el disponible y las barras de Control se actualizan.

## 8. Dependencias
- `specs/ciclo-mensual.md` (datos activos del mes).
- `specs/control.md` (límites y su progreso).
- Summary actual (`src/app/api/reports/summary/route.ts`).
- `use-dashboard` hook y componentes existentes.

## 9. Riesgos
- **Fuentes de verdad de fijos**: en Perfil existe `fixedExpenses` del FinancialProfile; en la página Principal el usuario debería poder editarlos también — decidir si se editan en un modal que escribe al perfil (una sola fuente) o solo en Perfil.
- **Días restantes y timezone**: calcular con la misma lógica de timezone del rollover.

## 10. Out of Scope
- Comparativa mes a mes (eso es Reportes).
- Proyecciones/forecast IA.
- Múltiples cuentas/billeteras.
- Personalización de categorías desde Principal (seed/Perfil).