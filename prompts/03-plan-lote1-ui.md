# Plan — Lote 1: Botones de acciones a la derecha

> Orquestador · 2026-08-11 · Spec: `specs/lote1-ui-botones-derecha.md`
> Convención: en TODA fila de acciones → `[Cancelar] [Primaria]`, fila alineada
> a la derecha (`justify-end`). Primaria (verde submit o rojo danger) siempre
> pegada al borde derecho. NO cambiar estilos, textos ni lógica.

## Baseline verificado (pre-ejecución)

- `npm test` → **201/201 passing (24 archivos)** ✅ (corrido por orquestador)
- Tests de modales usan `getByRole('button', { name })` → posición-independientes,
  NO deberían romperse. No tocar tests salvo fallo.
- Discrepancia spec vs. código: la fila "modal meta" de la spec
  (`metas/page.tsx:150-158`) ya no existe inline — el modal vive en
  `src/components/goals/goal-create-modal.tsx`. Los botones del header de
  `metas/page.tsx` (L146-161: "Registrar aporte" / "Registrar nueva meta") NO son
  fila de acciones de modal → fuera de scope.
- `report/page.tsx` y `src/components/reports/*`: sin filas de acciones
  (solo botones sueltos "Reintentar"/"Volver") → sin cambios; la regla queda
  documentada para futuros botones.

## Fase 1 — Modales de Control (archivos 1-2)

### 1. `src/components/budgets/budget-form-modal.tsx` (L253-264)
- Hoy: `<div className="flex flex-wrap gap-3">` con `[submit Crear/Guardar] [Cancelar]`.
- Cambio EXACTO:
  - L253: `className="flex flex-wrap gap-3"` → `className="flex flex-wrap justify-end gap-3"`.
  - Mover el `<button type="button" ...>Cancelar</button>` (L261-263) ANTES del
    `<button type="submit" ...>` (L254-260). Conservar todos los props/handlers.

### 2. `src/app/control/page.tsx` (L175-190, diálogo inline eliminar límite)
- Hoy: `<div className="mt-5 flex flex-wrap gap-3">` con `[Sí, eliminar (danger)] [Cancelar]`.
- Cambio EXACTO:
  - L175: agregar `justify-end` → `className="mt-5 flex flex-wrap justify-end gap-3"`.
  - Mover el botón `Cancelar` (L183-189) ANTES del `Sí, eliminar` (L176-182).

## Fase 2 — Modales de Metas (archivos 3-6)

### 3. `src/components/goals/goal-create-modal.tsx` (L156-163)
- L156: `flex flex-wrap gap-3` → `flex flex-wrap justify-end gap-3`.
- Mover `Cancelar` (L160-162) antes del submit `Crear meta` (L157-159).

### 4. `src/components/goals/goal-contribution-modal.tsx` (L154-161)
- L154: idem `justify-end`.
- Mover `Cancelar` (L158-160) antes del submit `Registrar ahorro` (L155-157).
- NO tocar la variante `goals.length === 0` (L81-85): botón único "Cerrar",
  ya tiene `flex justify-end`.

### 5. `src/components/goals/goal-delete-modal.tsx` (L79-91)
- L79: `mt-4 flex flex-wrap gap-3` → `mt-4 flex flex-wrap justify-end gap-3`.
- Mover `Cancelar` (L88-90) antes del danger `Sí, eliminar`/`Eliminar meta` (L80-87).

### 6. `src/components/goals/goal-withdrawal-modal.tsx` (L115-122)
- L115: `flex flex-wrap gap-3` → `flex flex-wrap justify-end gap-3`.
- Mover `Cancelar` (L119-121) antes del submit `Confirmar retiro` (L116-118).

## Fase 3 — Modales de Movimientos (archivos 7-8)

### 7. `src/components/movements/movements-list.tsx` (L268-275)
- Hoy: `<div className="mt-5 flex flex-wrap gap-3">` con `[Sí, eliminar (danger)] [Cancelar]`.
- L268: agregar `justify-end`.
- Mover `Cancelar` (L272-274) antes de `Sí, eliminar` (L269-271).

### 8. `src/components/movements/movement-form.tsx` (L333-350)
- Verificación pedida: **NO hay Cancelar en modo creación** — el botón `Cancelar`
  solo se renderiza si `editing` (L341-349). El modal contenedor
  (`src/app/page.tsx` L357-380, componente `Modal`) cierra con X, backdrop y
  Escape vía `closeModal`, y `onCancel={closeModal}` → mismo handler.
- Cambio EXACTO:
  - L333: `flex flex-wrap gap-3` → `flex flex-wrap justify-end gap-3`.
  - Hacer `Cancelar` INCONDICIONAL: eliminar el wrapper `{editing ? ... : null}`
    y renderizar `<button type="button" onClick={onCancel}
    className="btn-brutal btn-brutal-secondary">Cancelar</button>` SIEMPRE,
    ANTES del submit (L334-340). El texto del submit no cambia
    ("Registrar movimiento" / "Guardar cambios").
  - Comportamiento resultante: Cancelar = X = backdrop = Escape (cierra sin
    guardar). Único call-site de `MovementForm`: `src/app/page.tsx` L369
    (verificado con grep) — `onCancel` siempre definido.

## Fase 4 — Página Perfil (archivo 9)

### 9. `src/app/perfil/page.tsx`
- Diálogo eliminar cuenta (L387-404): YA cumple — DOM `[Cancelar] [Sí, eliminar]`
  con `sm:flex-row sm:justify-end`. **NO tocar.**
- Botón suelto "Guardar cambios" (L233-235): envolver en
  `<div className="flex justify-end">...</div>`.
- Botón suelto "Cambiar contraseña" (L294-296): envolver en
  `<div className="flex justify-end">...</div>`.
- "Cerrar sesión" (L300-307, `w-full`) y "Eliminar cuenta" (L308-318, `w-full`):
  **NO tocar** — ya ocupan el ancho completo, la alineación no aplica
  (respetar indicación de la spec sobre `w-full`).

## Fase 5 — Password recovery + Report (archivos 10-11)

### 10. `src/components/auth/password-recovery.tsx`
- Paso `request` (L125-144): hoy `[Pedir token (primaria)] [Cancelar]` en
  `mt-4 flex flex-wrap gap-2` → agregar `justify-end` y mover `Cancelar`
  (L134-143) antes de `Pedir token` (L126-133).
- Paso `form` (L186-204): hoy `[Restablecer (submit)] [Cancelar]` en
  `flex flex-wrap gap-2` → agregar `justify-end` y mover `Cancelar`
  (L194-203) antes del submit (L187-193).
- Paso `done` (L97-103): botón único "Volver al login" → NO tocar.

### 11. `src/app/report/page.tsx`
- Sin cambios (verificado: no hay filas de acciones en la página ni en
  `reports-list.tsx` / `reports-detail.tsx`). Regla documentada para futuros.

## Fase 6 — Verificación

### Gates (regresión = 0)
1. `npm test` → **201/201** (obligatorio, mismo conteo del baseline).
2. `npx tsc --noEmit` → 0 errores.
3. `npm run lint` → 0 errores.
4. `npm run build` → exitoso.
5. `npm run test:coverage` → thresholds ≥70% (lines/statements, `vitest.config.ts` L28-31).
- Si algún test falla por posición (no esperado: todos usan queries por nombre),
  actualizar SOLO ese test, nunca la lógica.

### Verificación visual (Chromium real)
Precondición: `docker compose up -d mongo` + `npm run dev`, sesión iniciada.
1. `/control` → "Nuevo límite": `[Cancelar] [Crear presupuesto]` a la derecha.
   Y desde una BudgetCard → "Eliminar": `[Cancelar] [Sí, eliminar]` a la derecha.
2. `/metas` → 4 modales: "Registrar nueva meta", "Registrar aporte", "Retiro"
   (desde GoalCard), "Eliminar" (desde GoalCard) → todos `[Cancelar] [Primaria]`
   alineados a la derecha.
3. `/` (Principal) → "Nuevo movimiento": ahora DEBE verse `[Cancelar]
   [Registrar movimiento]` a la derecha (antes no había Cancelar). Editar un
   movimiento: `[Cancelar] [Guardar cambios]`. Borrar movimiento:
   `[Cancelar] [Sí, eliminar]`.
4. `/perfil` → "Guardar cambios" y "Cambiar contraseña" pegados a la derecha;
   "Eliminar cuenta" → diálogo con `[Cancelar] [Sí, eliminar]` a la derecha.
5. `/login` → "¿Olvidaste tu contraseña?" → ambos pasos con `[Cancelar]
   [Primaria]` a la derecha.
- Check visual por modal: primario (verde/rojo/ámbar) = botón más cercano al
  borde derecho; Cancelar a su izquierda.

## Restricciones
- NO cambiar colores, tamaños, textos, handlers ni lógica de apertura/cierre.
- NO agregar dependencias. NO tocar tests salvo fallo.
- Mantener `flex-wrap` en todas las filas (wrapping mobile).
- Commits: Conventional Commits (ej. `fix(ui): alinear botones de acciones a la
  derecha en modales`).
