---
name: report
description: "Spec de la página Reportes (/report): historial de snapshots mensuales compactados — salud financiera, cumplimiento de límites, ahorros."
---

# SPEC — Página de Reportes (/report)

> Estado: APROBADA para planificar. DEPENDE de `specs/ciclo-mensual.md` (los snapshots son la fuente de datos).

## 1. Problema
El usuario no tiene forma de ver "cómo le fue" en un mes cerrado: el dashboard solo muestra el presente y el detalle queda mezclado. Tras el cierre mensual, cada mes produce un snapshot compactado que hoy no tiene dónde mostrarse. Falta la página que consume ese historial y lo presenta como reporte.

## 2. Solución propuesta
Página `/report` (Reportes) que lista los snapshots mensuales del usuario (del más reciente al más antiguo), con una **vista de detalle** por mes que muestra de forma compacta:

1. **Encabezado**: mes + balance del mes (ingresos − gastos).
2. **Rendimiento (stat cards)**: ingresos, gastos totales (fijos + variables), ahorro del mes, score financiero + mensaje.
3. **Cumplimiento de límites (tabla)**: por categoría con límite: presupuestado, gastado, % usado, estado (sano/alerta/excedido).
4. **Gastos por categoría (donut)** + separación fijo/variable.
5. **Metas de ahorro**: aporte total del mes + progreso de cada meta al cierre.
6. **Métricas de contexto**: día con más gastos, promedio diario, top categoría excedida / mejor gestionada, N de transacciones.

El detalle individual de transacciones del mes NO se muestra (compactación fuerte, opción B aprobada).

## 3. Usuarios afectados
Único usuario, revisando su historial financiero mensual.

## 4. Flujos de usuario
1. **Ver historial**: entro a `/report` → lista de meses cerrados (cards o timeline) → click en uno → detalle del mes.
2. **Comparar** (básico): el listado muestra el balance de cada mes para comparar rápido sin abrir detalle.

## 5. Requisitos funcionales
- [ ] RF1: Nueva ruta `/report` (protegida por proxy como las demás).
- [ ] RF2: `GET /api/reports` → lista de snapshots (mes, balance, income, expenses, savings) ordenados DESC por `monthKey`.
- [ ] RF3: `GET /api/reports/[monthKey]` → detalle completo del snapshot (todos los campos).
- [ ] RF4: Si no hay snapshots aún (primer mes en curso), la página muestra estado vacío descriptivo: "Aún no hay reportes. Tu primer reporte se generará al cierre del mes." SIN error.
- [ ] RF5: La vista detalle muestrá las 6 secciones del punto 2. (encabezado, stat cards, cumplimiento, donut, metas, métricas).
- [ ] RF6: Componentes: `ClientSection` reutilizable para contenido estático a escala.
- [ ] RF7: La URL acepta `?mes=2026-08` para deep-link directo a un mes.
- [ ] RF8: Tests: GET lista sin sesión (401), GET lista con snapshots sembrados, GET detalle existente/no existente (404).

## 6. Requisitos no funcionales
- **Compatibilidad**: si no hay snapshot, NO romper con 500 — estado vacío.
- **UI**: mobile-first, estilo brutalist consistente, `ProgressBar` Tremor en cumplimiento.
- **Testeo**: cobertura de las rutas nuevas.

## 7. Criterios de aceptación
- [ ] Dado que no hay snapshots, cuando entro a `/report`, entonces veo el estado vacío y NO un error.
- [ ] Dado un snapshot de 2026-08 sembrado, cuando hago `GET /api/reports/2026-08`, entonces veo sus métricas; cuando pido `2026-09`, entonces 404.
- [ ] Dado dos snapshots, cuando hago `GET /api/reports`, entonces vienen ordenados del más reciente al más antiguo.

## 8. Dependencias
- Modelo `MonthlySnapshot` (spec ciclo-mensual).
- `getExpensesByCategoryData()` / formato de donut (reusar de dashboard).
- Componentes UI existentes (Modal, MoneyInput, ProgressBar, card-brutal).

## 9. Riesgos
- **Gran volumen de snapshots**: listar 60+ meses debe paginar/seccionar por año (decidir en plan).
- **Formato de montos**: usa `baseCurrency` del perfil (la moneda pudo cambiar entre meses; el snapshot guarda el valor ya formateado o la divisa de ese momento — decidir).

## 10. Out of Scope
- Comparativa entre meses (líneas de evolución).
- Exportar reporte a CSV/PDF.
- Corrección manual de un snapshot (es inmutable, se regenera solo si se re-roolean).