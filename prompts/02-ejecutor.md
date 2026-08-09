# Prompt 2 — EJECUTOR (Features: Gastos de pareja + Recuperación de contraseña)

> Pegá este prompt en OpenCode (agente `build`) con tu modelo eficiente.
> El ejecutor implementa archivo por archivo siguiendo el plan del orquestador.
> Incluí ANTES el plan completo generado por el orquestador en la sección final.

# Rol
Sos el EJECUTOR de código de CashinsightApp. Implementás el plan del orquestador para las features **Gastos de pareja** y **Recuperación de contraseña**, archivo por archivo, siguiendo las reglas del proyecto y las specs aprobadas `specs/gastos-pareja.md` y `specs/recuperacion-password.md`.

# Reglas del proyecto (CashinsightApp)
- Next.js 16 App Router + TypeScript strict (sin `any`)
- TailwindCSS + Tremor para UI; UI en español rioplatense ("¿Quién pagó?", "Balance de pareja", "Liquidar", "¿Olvidaste tu contraseña?")
- Tests con Vitest 4 (API con Mongo real, componentes con jsdom per-file); la suite tiene 153 tests que NO deben romperse
- JAMÁS hardcodear secretos — usar `process.env` (JWT_SECRET ya existe)
- Commits: NO hacer commits (el humano revisa antes)

# Las specs aprobadas (fuente de verdad)
Leé Y respetá: `specs/gastos-pareja.md` y `specs/recuperacion-password.md`. La `constitution.md` es la autoridad máxima: **single-user NO se toca** (la pareja comparte la misma cuenta).

# Decisiones YA tomadas (NO re-abrir)
## Feature A — Gastos de pareja
- `paidBy: 'yo' | 'pareja' | 'compartido' | null` (default null), SOLO válido para `expense` (400 para otros tipos).
- Tipo `'settlement'` en el enum de `type`: requiere amount > 0 + paidBy + description; NO requiere category/goal; **excluido de TODOS los agregados del presupuesto** (totalIncome, totalExpense, totalFixed, totalVariable, availableToSpend, perDayRemaining, savingsRate, score, donut, métricas de finanzas).
- `coupleBalance` aditivo en `GET /api/reports/summary`: `{ paidByMe, paidByPartner, net, status }`; `compartido` cuenta 50/50; las liquidaciones reducen el neto según dirección; SOLO mes activo (NO tocar MonthlySnapshot).
- UI: selector en el form SOLO cuando type === 'expense'; bloque "Balance de pareja" en Principal con botón "Liquidar" (form pre-cargado type=settlement, monto sugerido |net|); flex + informativo (sin splits, sin deudas automáticas).

## Feature B — Recuperación de contraseña
- `POST /api/auth/forgot` (sin sesión): token JWT 32 bytes hex con `purpose: 'reset'`, TTL 15 min; guardar SOLO hash SHA-256 + expiresAt en User (2 campos opcionales); imprimir el token plano en console.log; respuesta 200 genérica.
- `POST /api/auth/reset` (sin sesión): valida firma + purpose + sub + exp + hash; actualiza passwordHash (bcryptjs); borra los campos de reset (one-time); destroySessionCookie defensivo; NO crea sesión; errores 400 con mensaje claro.
- UI en `/login`: "¿Olvidaste tu contraseña?" → pedir token → form token + contraseña nueva → redirección a login.
- Sin email/SMTP, sin 2FA, sin invalidar todas las sesiones.

# ⛔ Restricciones
- NO rediseñar la arquitectura (seguir el plan del orquestador)
- NO modificar `.env`, `AGENTS.md` ni `constitution.md` (el single-user se mantiene)
- NO agregar dependencias npm — si algo requiere una dependencia, DETENTE y documentalo
- NO hacer commits
- NO implementar out-of-scope: split porcentual, balance histórico/snapshots, multi-usuario/workspaces, notificaciones de balance, SMTP, 2FA
- Los 153 tests previos deben pasar sin modificación; si algo requiere ajuste mínimo, documentarlo explícitamente
- Rastrear TODOS los usos de `TransactionKind`/`type` (filtros, donut, labels, validaciones) para que `settlement` quede excluido donde corresponda y no rompa el front

# Orden de implementación (del plan del orquestador)
Las fases vienen del plan. Verificar al final de cada fase `npx tsc --noEmit` y los tests de esa fase.

# Criterio de entrega (global de las features)
- [ ] `Transaction` con `paidBy` opcional + tipo `settlement` (modelo + types + Zod)
- [ ] `settlement` excluida de todos los agregados del summary (tests lo verifican explícitamente)
- [ ] `coupleBalance` en el summary con matriz de balance correcta (50/50 incluido)
- [ ] UI: selector "¿Quién pagó?" (solo expense) + bloque Balance de pareja + botón Liquidar
- [ ] `forgot` genera token + hash en User + console.log; `reset` valida y cambia la contraseña (one-time, TTL 15 min)
- [ ] UI de recuperación en `/login`
- [ ] Tests: 153 previos + nuevos (balance, settlement, validaciones Zod, reset: éxito/one-time/expirado/forjado/sin usuario) pasan
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run build` sin errores
- [ ] Sin secretos hardcodeados y sin dependencias npm nuevas

---
# PLAN DEL ORQUESTADOR (pegar aquí)

[Copiá acá el plan generado por el orquestador, fases con archivos y detalle técnico]