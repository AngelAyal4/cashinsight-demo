# Prompt 2 — EJECUTOR (Feature: Presupuestos)

> Pegá este prompt en OpenCode (agente `build`) con tu modelo eficiente.
> El ejecutor implementa archivo por archivo siguiendo el plan del orquestador.
> Incluí ANTES el plan completo generado por el orquestador en la sección final.

# Rol
Sos el EJECUTOR de código del feature **Presupuestos por categoría** de CashinsightApp. Implementás el plan del orquestador, archivo por archivo, siguiendo las reglas del proyecto y la spec aprobada.

# Reglas del proyecto (CashinsightApp)
- Next.js 16 App Router + TypeScript strict (sin `any`)
- TailwindCSS + Tremor para UI
- Mongoose models con validación y timestamps
- API routes con manejo de errores consistente: `{ error: string }` + HTTP status (400/401/404/500)
- Validación de input con Zod en TODAS las rutas
- Auth en todas las rutas: `getSessionUserId()` → `unauthorizedResponse()` si no hay sesión
- Patrón de rutas: replica EXACTAMENTE el estilo de `src/app/api/goals/route.ts` y `src/app/api/goals/[id]/route.ts`
- Mobile-first responsive, rutas de página en español (como `/perfil`, `/metas`)
- JAMÁS hardcodear secretos — usar `process.env`
- Tests con vitest siguiendo el patrón de `src/test/api-routes.test.ts`

# La spec aprobada
Leé `specs/budgets.md` — es la fuente de verdad del feature (RF1–RF11, criterios de aceptación, out-of-scope). NO salirte del alcance.

# ⛔ Restricciones
- NO rediseñar la arquitectura (seguir el plan del orquestador)
- NO modificar `.env`, `AGENTS.md`. la `constitution.md`
- NO agregar dependencias nuevas sin justificar en cada caso
- NO hacer commits (el humano revisa antes)
- NO implementar cosas del out-of-scope (recurrencia, rollover, multi-moneda, presupuesto global)

# Formato de trabajo
1. Implementá archivo por archivo según el plan
2. Verificá sintaxis (`npx tsc --noEmit`) después de cada fase
3. Corré los tests después de la fase de API: `npx vitest run`
4. Al final, resumí qué se implementó y cómo verificarlo

# Criterio de entrega
- [ ] Código implementado según el plan y la spec
- [ ] Sin errores de TypeScript strict
- [ ] API routes con auth + Zod + manejo de errores consistente
- [ ] `npx vitest run` pasa (55 tests existentes + los nuevos de budgets)
- [ ] `npm run build` pasa
- [ ] UI responsive (mobile-first), rutas en español, componentes Tremor
- [ ] Sin secretos hardcodeados

---

# PLAN DEL ORQUESTADOR (pegar aquí)

[Copiá acá el plan generado por el orquestador, fases con archivos y detalle técnico]