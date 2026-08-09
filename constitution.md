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
- **Módulos centrales:** transactions, categories, budgets (límites de control), monthly-snapshots, reports, auth
- **Flujo de datos:** Client Components fetchean a API Routes → Mongoose → MongoDB
- **Capas:** UI (React) → API Routes (manejo HTTP) → Models (Mongoose) → DB (MongoDB)

### 1.2 Stack (fijo por proyecto)
- Frontend: Next.js 16 (App Router), React 19, TypeScript strict, TailwindCSS, Tremor
- Backend: Next.js API Routes, Mongoose, Zod (validación)
- Base de datos: MongoDB 7 (Docker local)
- Auth: JWT propio (bcryptjs + jsonwebtoken) con credenciales email/password. Futuro: Google OAuth

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
- Contraseñas hasheadas con bcryptjs
- Sesión con JWT firmado en cookie httpOnly (sameSite, maxAge definido)
- Protección de API routes y páginas via middleware (401/redirect sin sesión)

### 1.5 Calidad UI
- Mobile-first con Tailwind
- HTML semántico (label, alt, aria donde aplique)
- Componentes Tremor para dashboards (consistencia visual)
- Loading states y error states en toda interacción async
- Responsive: 320px → 1920px

### 1.6 Principio del Ciclo Mensual (inmutable)
- La app opera en CICLOS MENSUALES: arranca el día 1 de cada mes con el estado del mes
  anterior **compactado** (NUNCA borrado) y el actual en cero.
- NINGÚN dato se destruye jamás: el cierre compacta a un snapshot y queda disponible
  como histórico en Reportes. El espacio de trabajo activo regenera desde cero.
- El cierre se desencadena la primera vez que la app recibe un request en un mes nuevo
  (lazy rollover) — sin cron externo obligatorio.

## 2. Reglas de Negocio

### 2.1 Transacciones
- Toda transacción tiene: monto (>0), descripción, categoría, tipo (income/expense/saving/withdrawal), fecha
- Montos siempre positivos — el tipo define si es ingreso o gasto
- Las transacciones pertenecen al mes de su fecha; al cerrar el mes se archiva su serie

### 2.2 Límites de Control (budgets)
- Los límites PERSISTEN entre meses (son configuración del usuario, no datos mensuales)
- El progreso es mensual: se calcula (gastos del mes actual / monto límite) × 100
- Períodos permitidos: weekly, monthly, yearly (informativos para el cálculo)
- Un límite por categoría por período de vigencia [startDate, endDate]

### 2.3 Categorías
- Cada categoría tiene tipo fijo (ingreso, gasto)
- Las categorías de gastos se clasifican como fijo o variable (campo `behavior`)
- Categorías por defecto se crean al inicializar la DB
- Colores en formato hex (#RRGGBB)

### 2.4 Usuarios
- Single-user: solo existe UNA cuenta en el sistema
- El primer registro crea el usuario; intentos posteriores devuelven error
- El usuario puede eliminar su cuenta (borra todo su dato, incluido histórico)

### 2.5 Cierre Mensual (rollover)
- El 1er request del mes nuevo dispara: compactar mes anterior + inicializar mes actual
- La compactación genera un **MonthlySnapshot** con: ingresos, gastos (fijos/variables), ahorros, cumplimiento de límites, score financiero
- El detalle individual del mes anterior NO se muestra en ningún lugar (queda archivado)
- Los límites de control NO se regeneran: persisten tal cual los configuró el usuario
- El cierre debe ser idempotente (no generar doble snapshot si dos requests llegan a la vez)

## 3. Páginas (mapa de la app)

| Ruta | Nombre | Rol |
|---|---|---|
| / | Principal | Maneja el presupuesto general: ingresos + gastos fijos y variables + indicadores |
| /control | Control | Límites de gasto por categoría variable (ocio, comida, farmacia...) |
| /metas | Metas | Metas de ahorro con progreso |
| /perfil | Perfil | Datos financieros, divisas, cuenta |
| /report (Reportes) | Reporte del mes → historial de snapshots mensuales |
| /help | Ayuda | Cómo usar la app, qué hace cada página |

## 4. Fuera de Alcance (MVP)
- Google OAuth / proveedores externos (futuro)
- Multi-moneda por transacción (divisa base + ahorro global)
- PWA / notificaciones push
- App móvil nativa
- Recordatorios automáticos (cron externo)