# CashinsightApp

> 🚀 **Demo en vivo:** [https://cashinsight-demo.vercel.app](https://cashinsight-demo.vercel.app) — datos ficticios, sin registro

## Sobre el proyecto

CashinsightApp es una aplicación de finanzas personales para gestionar presupuestos, gastos y metas de ahorro a nivel mensual. Pensada para uso personal y de pareja, permite llevar el control de los límites de gasto, visualizar indicadores del mes y generar reportes históricos para entender hacia dónde va el dinero.

## Funcionalidades

- **Presupuesto mensual** — Ingresos, gastos fijos y variables, indicadores clave del mes al día.
- **Control de límites** — Categorías con límites de gasto configurables y visualización de progreso.
- **Metas de ahorro** — Creación de metas con aportes y retiros, seguimiento del progreso.
- **Balance de pareja** — Gastos compartidos con reparto configurable, cálculo de quién le debe a quién y liquidación.
- **Reportes mensuales** — Snapshots por mes y comparativa temporal de gastos por categoría.
- **Modo demo** — Datos ficticios pre-cargados, sin registro, para explorar la app sin fricción.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript strict, TailwindCSS, Tremor, Recharts
- **Backend:** Next.js API Routes, Mongoose, Zod
- **DB:** MongoDB 7
- **Auth:** JWT (httpOnly cookie)

## Estructura

```
src/
├── app/          # Pages + API Routes
├── components/   # Componentes reutilizables
├── hooks/        # Custom hooks
├── lib/          # Utilidades (db, auth, session, rate-limit)
├── models/       # Modelos Mongoose
├── proxy.ts      # Middleware (auth + redirects)
└── types/        # Types TypeScript
```