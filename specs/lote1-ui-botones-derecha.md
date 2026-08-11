# Spec — Lote 1: Botones de acciones a la derecha (convención de modales)

> Fecha: 2026-08-10 · Estado: para orquestador/ejecutor · Prioridad: alta (antes del deploy Vercel)
> Pedido del usuario: "mover los botones a la derecha, el botón verde siempre debe ser el que esté más cerca del borde".

## Regla global (la convención)

En TODA fila de acciones (modales y diálogos de confirmación):

1. Orden de izquierda a derecha: **[Cancelar] [Primaria]**.
2. La fila se alinea a la **derecha** del contenedor (`justify-end` en flex, o `ml-auto` en el primer botón).
3. **Primaria** = el botón de la acción principal del contexto:
   - verde (`btn-brutal`, submit) en formularios → **siempre el más cerca del borde derecho**;
   - rojo (`btn-brutal-danger`) en diálogos de confirmación destructiva → también el más a la derecha.
4. Queda prohibido el orden `[Primaria] [Cancelar]` en el DOM (estado actual en varios modales).

## Cambios por archivo (estado actual → objetivo)

| Archivo | Hoy (DOM) | Objetivo |
|---|---|---|
| `src/components/budgets/budget-form-modal.tsx:254-263` (modal Control) | `[Crear presupuesto] [Cancelar]` | `[Cancelar] [Crear presupuesto]`, fila `justify-end` |
| `src/app/control/page.tsx:179-190` (confirmar borrado) | `[Eliminar] [Cancelar]` | `[Cancelar] [Eliminar]`, fila `justify-end` |
| `src/app/metas/page.tsx:150-158` (modal meta) | `[Crear meta] [Cancelar]` | `[Cancelar] [Crear meta]`, fila `justify-end` |
| `src/components/movements/movements-list.tsx:271-274` (confirmar borrado) | `[Eliminar] [Cancelar]` | `[Cancelar] [Eliminar]`, fila `justify-end` |
| `src/app/perfil/page.tsx` | `[Cancelar] [Sí, eliminar]` ya ordenado (L389-403); botones sueltos sin alinear (Guardar cambios L233, Cambiar contraseña L294, Cerrar sesión L304 w-full) | Filas de acciones con `justify-end`; botones sueltos de formularios alineados a la derecha (`ml-auto` o contenedor flex); NO tocar `w-full` de Cerrar sesión → reemplazar por fila alineada a la derecha si rompe el layout, usar contenedor |
| `src/components/movements/movement-form.tsx:335` (modal Principal/Metas) | Submit único | Verificar si el modal tiene Cancelar (X/backdrop). Si NO tiene: agregar `[Cancelar] [Registrar movimiento]` alineado a la derecha (Cancelar cierra sin guardar, igual que el X/backdrop) |
| `src/app/report/page.tsx` | Sin botones de acción a la vista | Aplicar la misma convención si hay filas de acciones; si no hay, dejar regla documentada para futuros botones |
| `src/components/auth/password-recovery.tsx:140-204` | `[Cancelar] [Enviar]`? (orden a verificar) | Aplicar la misma convención (Cancelar a la izquierda, primaria a la derecha) |

## Fuera de scope

- NO cambiar colores, tamaños, textos ni estilos de los botones (solo orden y alineación).
- NO tocar la lógica de los modales (cómo se abre/cierra, qué guarda).
- NO tocar `budget-card.test.tsx` ni `movements-list.test.tsx` salvo que fallen por posición (usan `getByRole` por nombre, no posición → no deberían romperse).

## Criterios de aceptación

1. En cada modal/con diálogo listado, el botón primario (verde o rojo) está pegado al borde derecho y Cancelar a su izquierda.
2. Ningún modal queda con `[Primaria] [Cancelar]`.
3. Las filas de acciones están alineadas a la derecha visualmente (verificación en navegador real: `/control`, `/metas`, `/perfil`, `/`).
4. **Regresión = 0**: 201/201 tests pasando; tsc/lint/build verdes; coverage sin bajar del umbral 70%.
5. Sin dependencias nuevas.

## Verificación

- Gates completos (test, tsc, lint, build) + revisión visual en Chromium de los 4 modales (abrir modal en /control, /metas, / (registrar movimiento), /perfil (eliminar cuenta) y confirmar posición de los botones).