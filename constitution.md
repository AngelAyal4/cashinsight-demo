---
name: constitution
description: "Constitución del proyecto — reglas inmutables que gobiernan TODA la arquitectura y código. Revisada solo cuando cambian principios fundamentales, no por features."
---

# CONSTITUCIÓN — CashinsightApp

> Esta constitución es la fuente de autoridad superior del proyecto.
> Ningún feature, plan o tarea puede violar estas reglas.
> Se modifica SOLO cuando cambian principios fundamentales del proyecto.

## 1. Principios Inmutables

### 1.1 Arquitectura
- **Patrón:** Next.js App Router con API Routes (fullstack monolítico)
- **Módulos centrales:** transactions, categories, budgets, reports, auth (futuro)
- **Flujo de datos:** Client Components fetchean a API Routes → Mongoose → MongoDB
- **Capas:** UI (React) → API Routes (manejo HTTP) → Models (Mongoose) → DB (MongoDB)

### 1.2 Stack (fijo por proyecto)
- Frontend: Next.js 15 (App Router), React 19, TypeScript strict, TailwindCSS, Tremor
- Backend: Next.js API Routes, Mongoose, Zod (validación)
- Base de datos: MongoDB 7 (Docker local)
- Auth: Sin auth (MVP). Futuro: NextAuth.js con credenciales + Google

### 1.3 Estándares de Código (no negociables)
- Lenguaje principal: TypeScript (strict mode, sin `any`)
- Estilo: Prettier + ESLint (config Next.js)
- Testing: obligatorio para lógica de negocio (mínimo 70% cobertura)
- Commits: Conventional Commits (feat:, fix:, refactor:, docs:)
- Nombres: camelCase (variables/functions), PascalCase (componentes/types), kebab-case (archivos)

### 1.4 Seguridad
- JAMÁS hardcodear secretos — todo vía variables de entorno
- `.env` gitignored, `.env.example` versionado con placeholders
- Validación de input con Zod en TODAS las API routes
- Contraseñas hasheadas con bcryptjs (cuando se implemente auth)
- JWT para sesiones (cuando se implemente auth)

### 1.5 Calidad UI
- Mobile-first con Tailwind
- HTML semántico (label, alt, aria donde aplique)
- Componentes Tremor para dashboards (consistencia visual)
- Loading states y error states en toda interacción async
- Responsive: 320px → 1920px

## 2. Reglas de Negocio

### 2.1 Transacciones
- Toda transacción tiene: monto (>0), descripción, categoría, tipo (income/expense), fecha
- Montos siempre positivos — el tipo define si es ingreso o gasto
- No se pueden eliminar categorías con transacciones asociadas (soft-delete futuro)

### 2.2 Presupuestos
- Un presupuesto por categoría por período
- Períodos: weekly, monthly, yearly
- El progreso se calcula: (gastos del período / monto presupuestado) × 100

### 2.3 Categorías
- Cada categoría tiene tipo fijo (income o expense)
- Categorías por defecto se crean al inicializar la DB
- Colores en formato hex (#RRGGBB)

## 3. Fuera de Alcance (MVP)
- Autenticación/autorización
- Multi-moneda
- Exportar datos
- PWA / notificaciones push
- App móvil nativa
