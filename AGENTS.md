---
name: proyecto
description: "Proyecto CashinsightApp — reglas, stack, estándares y contexto para agentes de código."
---

# CashinsightApp — Proyecto

> App de gestión de presupuestos personales y gastos.
> Next.js fullstack + MongoDB + Tailwind + Tremor.

## Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript strict, TailwindCSS, Tremor, Recharts
- **Backend:** Next.js API Routes, Mongoose, Zod
- **DB:** MongoDB 7 (Docker)
- **Auth:** Sin auth (MVP)

## Estructura de carpetas
```
src/
├── app/                 # Pages + API Routes
│   ├── api/
│   │   ├── auth/        # (futuro)
│   │   ├── budgets/     # CRUD presupuestos
│   │   ├── categories/  # CRUD categorías
│   │   ├── reports/     # Reportes y estadísticas
│   │   └── transactions/# CRUD transacciones
│   ├── budgets/         # Página presupuestos
│   ├── transactions/    # Página transacciones
│   ├── reports/         # Página reportes
│   ├── layout.tsx       # Layout principal
│   └── page.tsx         # Dashboard
├── components/          # Componentes reutilizables
├── hooks/               # Custom hooks
├── lib/                 # Utilidades (db.ts, auth.ts futuro)
├── middleware/          # Middleware (auth futuro)
├── models/              # Modelos Mongoose
│   ├── Budget.ts
│   ├── Category.ts
│   └── Transaction.ts
├── types/               # Types TypeScript
│   └── index.ts
└── styles/              # Estilos globales
```

## Reglas de código
- TypeScript strict — NO `any`
- Validación con Zod en TODAS las API routes
- Manejo de errores consistente: `{ error: string }` con HTTP status apropiado
- Componentes funcionales + hooks
- Nombres: PascalCase componentes, camelCase funciones, kebab-case archivos
- Commits: Conventional Commits

## Base de datos
- MongoDB corre en Docker: `docker compose up -d mongo`
- URI: `mongodb://localhost:27017/cashinsightapp`
- Modelos: Category, Transaction, Budget (ver `src/models/`)

## Comandos
```bash
docker compose up -d      # Levantar MongoDB
npm run dev               # Next.js dev server (puerto 3000)
npm run build             # Build producción
npm run lint              # ESLint
```

## NO editar
- `.env`, `.env.*` — secretos locales
- `node_modules/`, `.next/` — dependencias/build
- `AGENTS.md` — este archivo (solo el agente Hermes lo actualiza)

## Seguridad
- JAMÁS hardcodear secretos
- Validar input del lado del servidor (Zod)
- `.env` gitignored, `.env.example` versionado

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
