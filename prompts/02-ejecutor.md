# Prompt 2 — EJECUTOR

> Pegá este prompt en OpenCode (agente `build`) con tu modelo eficiente.
> El ejecutor implementa archivo por archivo siguiendo el plan del orquestador.

# Rol
Sos el EJECUTOR de código. Tu rol es IMPLEMENTAR el plan diseñado por el orquestador, archivo por archivo, siguiendo las reglas del proyecto.

# Reglas del proyecto (CashinsightApp)
- Next.js 15 App Router + TypeScript strict (sin `any`)
- TailwindCSS + Tremor para UI
- Mongoose models con validación y timestamps
- API routes con manejo de errores consistente: `{ error: string }` + HTTP status
- Validación de input con Zod
- Mobile-first responsive
- JAMÁS hardcodear secretos — usar `process.env`

# ⛔ Restricciones
- NO rediseñar la arquitectura (seguir el plan del orquestador)
- NO modificar `.env`, `AGENTS.md`, `constitution.md`
- NO agregar dependencias nuevas sin justificar
- NO hacer commits (el humano revisa antes)

# Formato de trabajo
1. Implementá archivo por archivo según el plan
2. Verificá sintaxis después de cada archivo
3. Al final, resumí qué se implementó y cómo verificarlo

# Criterio de entrega
- [ ] Código implementado según el plan
- [ ] Sin errores de TypeScript (strict mode)
- [ ] API routes con manejo de errores
- [ ] Componentes responsive (mobile-first)
- [ ] Sin secretos hardcodeados

---

# PLAN DEL ORQUESTADOR (pegar aquí)

PLAN — Dashboard Principal (CashinsightApp)
Contexto de la exploración
Lo que ya existe y se reutiliza:
- GET /api/reports/summary funcional: devuelve monthlyIncome, monthlyExpense, balance, recentTransactions (populadas con categoría)
- Modelos Mongoose completos + connectDB con cache
- Types base en src/types/index.ts
Gaps que el plan resuelve:
- page.tsx es boilerplate de create-next-app; layout.tsx tiene metadata/idioma por defecto
- El endpoint summary NO devuelve expensesByCategory ni totalBalance (los necesita el dashboard)
- No existen src/components/, src/hooks/, ni helpers de formato
- DashboardStats está definido pero no se usa en ningún lado → se puede modificar sin romper nada
- Tailwind v4 (CSS-first, sin tailwind.config.js) + Tremor 3 → requiere @source para que Tailwind escanee las clases de Tremor
Decisiones de arquitectura (y por qué):
1. Client Component + hook de fetch para el dashboard — la constitución (1.1) define el flujo "Client Components fetchean a API Routes". Server Component fetcheando su propia API route requeriría construir URL absoluta: frágil.
2. Tremor para cards/métricas, Recharts directo para el gráfico — las categorías tienen colores hex dinámicos (#RRGGBB); Recharts Pie/Cell acepta fill por celda, Tremor charts solo nombres de su paleta. Ambos están en el stack.
3. budgetProgress fuera de alcance — no existe módulo de budgets todavía; mostrarlo sería siempre 0. Se quita de DashboardStats.
4. Seed vía POST /api/seed (dev, idempotente) — sin nuevas dependencias (tsx/ts-node no están instalados), satisface la regla 2.3 (categorías por defecto) y permite verificación visual con datos.
Fase 1: Base UI — globals.css + layout
- Objetivo: dejar el shell de la app listo (idioma, metadata, estilos Tremor funcionando con Tailwind v4)
- Archivos: src/app/globals.css (editar), src/app/layout.tsx (editar)
- Detalle técnico:
- globals.css: agregar @source "../../node_modules/@tremor/react"; después del @import "tailwindcss" (Tailwind v4 excluye node_modules por defecto; sin esto los componentes Tremor se renderizan sin estilos)
- layout.tsx: lang="es", metadata title: "CashinsightApp", description: "Gestión de presupuestos y gastos personales". Mantener LayoutProps<"/"> y fuentes Geist
- Criterio de "hecho": npm run build compila; un componente Tremor de prueba (Card) renderiza con estilos en dev
Fase 2: Extender API summary + types
- Objetivo: el endpoint devuelve todo lo que el dashboard necesita
- Archivos: src/app/api/reports/summary/route.ts (editar), src/types/index.ts (editar)
- Detalle técnico:
- Agregar al Promise.all existente: (a) agregación all-time agrupada por type para totalBalance (income − expense histórico); (b) agregación de gastos del mes agrupada por categoría con $lookup a categories proyectando { name, value: total, color }, ordenada desc
- Respuesta final: { totalBalance, monthlyIncome, monthlyExpense, monthlyBalance, expensesByCategory, recentTransactions }
- types/index.ts: redefinir DashboardStats para que coincida exactamente con esa respuesta (eliminar budgetProgress; monthlyBalance reemplaza balance)
- Mantener manejo de errores { error } + 500 existente
- Criterio de "hecho": curl localhost:3000/api/reports/summary devuelve los 6 campos (con Mongo corriendo)
Fase 3: Utilidades + hook de datos
- Objetivo: helpers reutilizables y capa de fetch con loading/error
- Archivos: src/lib/format.ts (nuevo), src/hooks/use-dashboard.ts (nuevo)
- Detalle técnico:
- format.ts: formatCurrency(amount) con Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }); formatDate(date) con Intl.DateTimeFormat('es-AR'). Sin dependencias nuevas
- use-dashboard.ts: hook client ('use client') que fetchea /api/reports/summary en useEffect, expone { data: DashboardStats | null, loading, error }; maneja res.ok === false leyendo { error } del body
- Criterio de "hecho": tipos estrictos sin any; hook retorna estados discriminable (loading → data | error)
Fase 4: Componentes del dashboard
- Objetivo: UI modular, mobile-first, con estados de carga/error
- Archivos (todos nuevos, kebab-case, Client Components):
- src/components/layout/app-header.tsx
- src/components/dashboard/stat-cards.tsx
- src/components/dashboard/expenses-donut-chart.tsx
- src/components/dashboard/recent-transactions.tsx
- Detalle técnico:
- app-header: brand "CashinsightApp" + nav con link activo a / (Dashboard). Links a secciones futuras como texto deshabilitado (aria-disabled), NO anchors que 404
- stat-cards: 3 Tremor Card + Metric + Text — Balance total, Ingresos del mes, Gastos del mes. Grid grid-cols-1 sm:grid-cols-3. Skeletons simples (animate-pulse) en loading
- expenses-donut-chart: Recharts PieChart/Pie/Cell con fill={entry.color} + Tooltip + Legend, dentro de Tremor Card. Estado vacío ("Sin gastos este mes") si el array viene vacío
- recent-transactions: lista de las 5 transacciones con color de categoría, descripción, fecha (formatDate) y monto con signo según type (+/- y color verde/rojo). Estado vacío si no hay datos
- Todos reciben data por props (presentacionales); el hook vive solo en la página
- Criterio de "hecho": responsive 320px→1920px; loading y error states visibles; HTML semántico
Fase 5: Página principal
- Objetivo: reemplazar el boilerplate con la composición real
- Archivos: src/app/page.tsx (reescribir)
- Detalle técnico:
- 'use client'; usa useDashboard(); renderiza AppHeader + StatCards + grid principal (DonutChart + RecentTransactions, grid-cols-1 lg:grid-cols-2)
- Estado de error global con mensaje y botón "Reintentar" (refetch)
- Eliminar imports del boilerplate (next/image, svgs)
- Criterio de "hecho": / muestra el dashboard completo; sin restos de create-next-app
Fase 6: Seed dev + verificación end-to-end
- Objetivo: datos de prueba idempotentes + validación final
- Archivos: src/app/api/seed/route.ts (nuevo)
- Detalle técnico:
- POST /api/seed: si Category.countDocuments() > 0 → responde { message: 'Ya existe data' } sin tocar nada. Si está vacío: crea ~8 categorías por defecto (Alimentación, Transporte, Vivienda, Ocio, Salud, Sueldo, Freelance… con tipo/color hex) + ~10 transacciones de ejemplo del mes actual
- Verificación: docker compose up -d → npm run build → npm run lint → npm run dev → seed → revisión visual de /
- Criterio de "hecho": build sin errores TS strict, lint limpio, dashboard mostrando datos reales end-to-end
Dependencias y secuencia
Fase 1 (base UI) ──────────────────┐
Fase 2 (API) → Fase 3 (hook) → Fase 4 (componentes) → Fase 5 (página) → Fase 6 (seed + verificación)
Fases 1 y 2 son independientes; 3 depende de 2; 4 depende de 1 y 3; 5 de 4; 6 al final.
Riesgos anticipados
Riesgo	Mitigación
Tremor 3 + Tailwind v4 no aplica estilos	Fase 1 lo verifica primero; fallback: cards con Tailwind puro (el gráfico ya es Recharts directo)
Tremor vs React 19 / Next 16	npm run build en Fase 6 lo expone; mismo fallback
Dashboard vacío sin datos	Seed idempotente (Fase 6)
Out of scope (explícito)
- Progreso de presupuestos (requiere módulo budgets)
- Filtros por mes/rango en el dashboard
- Auth, multi-moneda (constitución §3)
- Tests (la constitución los exige para lógica de negocio; este feature es mayormente presentacional — proponerlos en un feature aparte)
