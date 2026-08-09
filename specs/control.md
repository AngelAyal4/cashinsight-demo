---
name: control
description: "Spec de la página Control (/control): límites por categoría variable. Renombra /presupuestos y la reorienta a gastos variables."
---

# SPEC — Página Control (/control)

> Estado: APROBADA para planificar. DEPENDE de `specs/ciclo-mensual.md` (los límites persisten entre meses) y de la categorización fijo/variable.

## 1. Problema
Hoy la página `/presupuestos` define límites para CUALQUIER categoría sin distinguir fijas de variables. El usuario quiere que Control sea el lugar de los **gastos variables** (ocio, comida, farmacia...), porque los fijos se gestionan desde la página Principal (presupuesto general). Además el nombre "Presupuestos" confunde el rol: el presupuesto general vive en Principal, la página es de límites de control fino.

## 2. Solución propuesta
1. **Renombrar la ruta**: `/presupuestos` → `/control` (redirección 301 de la ruta vieja para no romper bookmarks).
2. **Reorientar el contenido**: la página solo muestra/crea límites para categorías de gasto con comportamiento **variable** (`behavior: 'variable'` o 'both').
3. **Mantener la funcionalidad existente** (cards con progreso, modales, widget) pero filtrar por comportamiento variable.
4. **Acompañar la semántica**: título "Control", subtítulo "Límites para tus gastos variables", copy que explica la diferencia con Principal.
5. El cierre mensual NO toca los límites (persisten — ver spec ciclo-mensual).

## 3. Usuarios afectados
Único usuario gestionando sus límites de gasto variable.

## 4. Flujos de usuario
1. **Ver Control**: entro a `/control` → veo límites de categorías variables (ej: Ocio, Comida, Farmacia, Entretenimiento) con su progreso del mes actual.
2. **Crear límite**: modal → solo categorías `expense` + `behavior: variable` → monto + período + fechas.
3. **Actualizar/eliminar**: igual que hoy.
4. **Al cierre mensual**: los límites quedan tal cual para el mes siguiente (el progreso de gasto reinicia).

## 5. Requisitos funcionales
- [ ] RF1: Nueva ruta `/control` copia de la página `/presupuestos` actual (con contenido renombrado).
- [ ] RF2: Redirección 301 de `/presupuestos` → `/control` (en proxy o next.config redirects).
- [ ] RF3: El endpoint `GET /api/budgets` y el `POST` aceptan/filtran por `behavior` (agregar a la spec: la categoría objetivo debe ser `variable`).
- [ ] RF4: El formulario de creación/edición lista solo categorías `type: 'expense'` **y** `behavior: 'variable'`.
- [ ] RF5: Los límites existentes de categorías hoy `fijo` (si los hubiera) migran su `behavior` o se muestran con aviso en Control (decidir en plan semilla).
- [ ] RF6: Nav (AppHeader) muestra "Control" apuntando a `/control`.
- [ ] RF7: El widget del dashboard "Presupuestos activos" sigue funcionando (cualquier límite activo, sin filtrar por behavior — el dashboard es general).
- [ ] RF8: Tests: la ruta vieja redirige (301), la nueva lista solo variables, el POST rechaza categorías fijas con 400.

## 6. Requisitos no funcionales
- **Backward-compat**: los bookmarks de `/presupuestos` funcionan (redirect).
- **UI**: mantener el estilo actual (cards + ProgressBar + modales).

## 7. Criterios de aceptación
- [ ] Dado que entro a `/presupuestos`, cuando la request llega, entonces recibo redirect a `/control`.
- [ ] Dado un usuario con límites de categoría variable y otro de categoría fija, cuando veo `/control`, entonces solo veo el variable.
- [ ] Dado que intento crear un límite para una categoría `fija`, cuando hago POST, entonces responde 400.

## 8. Dependencias
- `specs/ciclo-mensual.md` (persistencia de límites + archivo).
- Seed de categorías con `behavior` (fijo/variable) — agregar campo al modelo `Category`.
- Página `/presupuestos` existente + componentes de budgets.

## 9. Riesgos
- **Redirect vs duplicado**: si mañana OpenCode renombra a copia y deja la vieja, dos rutas divergen. El proxy/redirect debe ser la única fuente, y la página vieja eliminarse (no duplicarse).
- **Categorías sin comportamiento**: categorías custom creadas antes del campo `behavior` → default `variable` (razonable para gastos custom).

## 10. Out of Scope
- Crear categorías desde Control (se crean en Principal/seed).
- Límites para gastos fijos (eso vive en Principal como presupuesto general).
- Recurrencia automática de límites.