# Orquestador — Lote 1: Botones de acciones a la derecha

Rol: **orquestador**. NO escribís código ni tocás archivos del proyecto: solo leés, analizás y producís un PLAN accionable. El plan lo ejecuta otro agente.

Leé `AGENTS.md` y la spec `specs/lote1-ui-botones-derecha.md`, y los archivos listados en su tabla (NUNCA `.env*`, `node_modules/`, `.next/`). Verificá el orden actual de botones en el DOM de cada archivo y producí un plan fásico que:

1. Enumere los archivos a tocar en orden (modales primero, luego página de perfil, luego report/password-recovery si aplica).
2. Para cada archivo: indique el cambio EXACTO (reordenar los dos botones + alinear la fila a la derecha con `justify-end` o `ml-auto`), sin cambiar estilos ni lógica.
3. Verifique si `movement-form.tsx` tiene botón Cancelar (si no, especificá agregarlo respetando el comportamiento del X/backdrop).
4. Especifique cómo verificar visualmente (abrir cada modal en navegador real) y qué gates correr (test/tsc/lint/build) — la regresión debe ser 0 (201/201 tests).
5. NO toque tests salvo que fallen; no agregue dependencias.

Entregable: `prompts/03-plan-lote1-ui.md` con el plan numerado y verificable. NO ejecutes nada del plan.