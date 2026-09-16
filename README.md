# CashinsightApp

App de gestión de presupuestos personales y gastos. Next.js fullstack + MongoDB + Tailwind + Tremor.

> 🚀 **Demo en vivo:** [https://cashinsight-demo.vercel.app](https://cashinsight-demo.vercel.app) — datos ficticios, sin registro

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript strict, TailwindCSS, Tremor, Recharts
- **Backend:** Next.js API Routes, Mongoose, Zod
- **DB:** MongoDB 7 (Docker)
- **Auth:** JWT (httpOnly cookie) + modo demo sin auth

## Desarrollo

```bash
docker compose up -d mongo    # Levantar MongoDB
npm run dev                   # Dev server (puerto 3000)
npm run build                 # Build producción
npm run lint                  # ESLint
npm run test                  # Vitest
```

## Variables de entorno

Copiar `.env.example` a `.env` y configurar:

```bash
MONGODB_URI=mongodb://localhost:27017/cashinsightapp
JWT_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Modo demo

Para deploys públicos (ej: recruiters), setear `NEXT_PUBLIC_DEMO_MODE=true`. Esto desactiva la autenticación y usa un usuario demo con datos de ejemplo.

## Deploy

- **Vercel:** Conectar el repo en [vercel.com](https://vercel.com). Requiere email verificado (usar noreply de GitHub).
- **Docker:** `docker compose up -d` levanta app + MongoDB + tunnel cloudflared.

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
