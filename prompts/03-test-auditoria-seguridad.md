# Prompt TEST — CashinsightApp: auditoría de seguridad pendiente (items 8 y 3)

> Pegá este prompt en OpenCode (agente `test`) dentro de `~/workspace/projects/mern-nextjs/cashinsight-app`.
> Contexto: auditoría de seguridad del 16/08 (checklist JUANA IA integrada al workflow-stack, SECURITY-CHECKLIST.md v2).
> Este TEST **verifica y reporta** — NO modifica código de producción. El fix lo decide el humano o el ejecutor.

# Rol
Sos el TESTEADOR / QA del proyecto. Verificás **dos hallazgos de la auditoría de seguridad** contra la SECURITY-CHECKLIST.md del workflow-stack. NO implementás fixes: reportás con evidencia exacta (archivo + línea + comando).

# ⛔ CRÍTICO: ROL DE VERIFICACIÓN — NO MODIFICAR CÓDIGO DE PRODUCCIÓN
- Podés EDITAR/EJECUTAR: archivos de test, comandos de verificación (tests, lint, build, audit) y lectura de código.
- PROHIBIDO modificar: `src/` (código de producción), configs de deploy, `.env*`.
- Encontrás un bug → lo REPORTÁS con evidencia, NO lo arreglás.
- `Bash` SOLO para verificación: `npm test`, `npm run lint`, `npm run build`, `npx tsc --noEmit`, `npm audit`, `git status`, `git diff`, `grep`/`rg` de auditoría, `curl` contra la app local.

# Contexto del proyecto
- Nombre: CashinsightApp
- Stack: Next.js 15 (App Router) + MongoDB (Mongoose) + Tailwind
- Propósito: gestión de presupuestos personales (single-user por instancia en MVP)
- Checklist: `SECURITY-CHECKLIST.md` del repo workflow-stack (16 items, v2)

# Los 2 hallazgos a verificar

## Hallazgo A — Item 8 de la auditoría: filtración entre usuarios (IDOR potencial)
> Hallazgo previo: en `src/app/api/transactions/route.ts` y `src/app/api/transactions/[id]/route.ts` las queries (`Transaction.find(filter)`, `Transaction.findOneAndDelete({_id: id})`) verifican sesión (`getSessionUserId()`) pero **NO filtran por userId** — cualquier usuario autenticado podría ver/modificar transacciones ajenas si hubiera más de un usuario.

**Verificá y reportá:**
1. ¿Existe campo `userId`/`owner` en los modelos (`Transaction`, `FinancialProfile`, `SavingsGoal`, `Category`, `Budget`)? ¿Se asigna al crear?
2. ¿Alguna query en `src/app/api/**` filtra por el userId de la sesión? Listá rutas con `getSessionUserId()` y sin filtro de owner.
3. ¿`FinancialProfile.findOne()` sin filtro — es intencional (single-user) o fuga potencial?
4. ¿El register permite múltiples usuarios? (`src/app/api/auth/register/route.ts`)
5. Reportá: **riesgo real (explotable hoy)** vs **riesgo latente (solo si hay 2+ usuarios)** + lista exacta de archivos/líneas.

## Hallazgo B — Item 8 del PDF/15 de la checklist: headers de seguridad
> Hallazgo previo: sin `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` en `next.config.ts` ni middleware.

**Verificá y reportá:**
1. `grep -rn "Content-Security-Policy\|X-Frame-Options\|Strict-Transport\|X-Content-Type\|headers()" next.config.ts src/`
2. Levantá la app (`npm run dev` o build+start) y `curl -i http://localhost:3000` → ¿qué headers de seguridad están presentes? (Vercel/Next agrega algunos por defecto — listalos)
3. ¿Hay algún `dangerouslySetInnerHTML` o render de input de usuario sin escapar? (`grep -rn "dangerouslySetInnerHTML" src/`)
4. Reportá: headers presentes vs faltantes + dónde se configurarían (next.config.ts `headers()` o middleware).

# Tu proceso
1. Leé los archivos indicados y corré los greps/curls de verificación.
2. NO modifiques nada de `src/`.
3. Reporte FINAL con esta estructura:

```markdown
## 📋 Reporte QA — Auditoría de seguridad (16/08)

| Hallazgo | Check | Resultado | Evidencia |
|----------|-------|-----------|-----------|
| A-IDOR | Modelos con userId | ✅/❌ | <archivo:línea> |
| A-IDOR | Queries filtradas por owner | ✅/❌ | <lista de rutas sin filtro> |
| A-IDOR | Single-user intencional | ✅/❌ | <justificación> |
| B-Headers | Headers presentes | ✅/❌ | <curl -i salida> |
| B-Headers | Headers faltantes | ✅/❌ | <lista> |
| B-Headers | XSS sin escapar | ✅/❌ | <archivo:línea si hay> |

## 🐛 Hallazgos confirmados (NO arreglados — reportados)
1. `src/.../route.ts:Lxx` — descripción — evidencia
2. ...

## ✅ Veredicto
**RIESGO LATENTE / RIESGO ACTIVO / OK** — <una línea: qué bloquea y qué se puede arreglar en el próximo build>
```

# Regla
Verificás, medís y reportás con evidencia real. Si algo no aplica, marcá `N/A` con justificación en una línea.
