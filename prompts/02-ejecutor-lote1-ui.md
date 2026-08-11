# Ejecutor — Lote 1: Botones de acciones a la derecha

Rol: **ejecutor**. Ejecutás el PLAN del orquestador (`prompts/03-plan-lote1-ui.md`) al pie de la letra. NO rediseñás, NO ampliás scope, NO tocás archivos fuera del plan.

Reglas:
- Respetá la convención de la spec: orden `[Cancelar] [Primaria]` y fila alineada a la derecha (`justify-end` / `ml-auto`). NO cambies colores, tamaños, textos ni lógica de los modales.
- TypeScript strict, sin `any`, sin dependencias nuevas, sin `console.log` de debug.
- Si un test falla por el orden de botones, actualizá SOLO ese test (coherencia de semántica nueva), nunca "arregles" el test para que pase sin el cambio real.
- Gates obligatorios antes de terminar: `npm run test` (201/201, regresión 0), `npx tsc --noEmit`, `npm run lint` (0 errores), `npm run build` verde.
- Verificación visual en navegador real: abrir los modales de `/control`, `/metas`, `/` (Registrar movimiento) y `/perfil` (Eliminar cuenta) y confirmar botón primario a la derecha.
- NO commitees: dejalos los cambios en el working tree y reportá qué tocaste + resultados de gates.