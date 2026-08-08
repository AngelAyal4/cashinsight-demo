---
name: spec-auth
description: "Spec del feature de autenticación (credenciales email/password + sesión JWT) — completada antes de planificar con el orquestador."
---

# SPEC — AUTH (Credenciales + Sesión JWT)

> Completada ANTES de planificar con el orquestador.

## 1. Problema

La app es de uso personal (single-user) pero hoy CUALQUIERA que acceda a `localhost:3000` puede ver y modificar todos los datos: dashboard, transacciones, metas, perfil. No hay barrera de entrada ni identidad. Sin auth, además, el modelo `FinancialProfile` y el onboarding quedan "sueltos" (cualquiera los puede pisar). El objetivo es cerrar la app con una sola cuenta protegida por email + password.

## 2. Solución propuesta

Módulo de auth con **JWT propio** (decidido: bcryptjs + jsonwebtoken, ya instalados):

- **Registro y login** por email/password (bcryptjs para hash, jamás texto plano).
- **Sesión**: JWT firmado con `JWT_SECRET` guardado en cookie `httpOnly` (7 días), persistente entre refreshes.
- **Protección**: `proxy.ts` (Next 16 — `middleware` está deprecado) valida la cookie en cada request: API routes de datos → `401 { error }`; páginas protegidas → redirect a `/login`.
- **UI**: páginas `/login` y `/register` con el estilo existente (Tremor, mobile-first), más logout y sesión visible en el `AppHeader`.
- Se elimina `src/lib/password.ts` (scrypt) y se reemplaza por bcryptjs, que es lo que manda la constitución §1.4.

## 3. Usuarios afectados

El único usuario de la app (single-user). Flujo completo: registrarse una vez → usar la app con sesión activa.

## 4. Flujos de usuario

1. **Registro**: `/register` → `POST /api/auth/register` (email + password válidos) → primer registro crea `User`, firma JWT, setea cookie → redirect `/onboarding` → al completar, dashboard.
2. **Registro duplicado**: segundo registro → `409 { error }` (constitución §2.4, single-user).
3. **Login**: `/login` → `POST /api/auth/login` → valida credenciales → setea cookie → redirect `/`.
4. **Logout**: botón en header → `POST /api/auth/logout` → borra cookie → redirect `/login`.
5. **Acceso sin sesión**: visitar `/`, `/metas`, `/perfil`, `/onboarding` o llamar a cualquier API de datos → redirect `/login` / `401 { error }`.
6. **Sesión activa**: visitar `/login` o `/register` → redirect `/` (ya está autenticado).
7. **Refresh**: al recargar, la cookie httpOnly persiste → `GET /api/auth/me` restaura el estado en la UI.

## 5. Requisitos funcionales

- [ ] **RF1 — Modelo `User`**: `email` único (lowercase, index único), `passwordHash`, timestamps.
- [ ] **RF2 — `POST /api/auth/register`**: Zod (email válido, password ≥ 8 chars), bcryptjs hash (cost default), crea el primer usuario, responde `201 { user }` sin exponer `passwordHash`. Si ya existe usuario → `409 { error: "Ya existe un usuario registrado" }`. Setea cookie de sesión.
- [ ] **RF3 — `POST /api/auth/login`**: Zod, verifica credenciales con bcryptjs. Error genérico `401 { error: "Credenciales inválidas" }` (no revelar si el email existe). Setea cookie de sesión.
- [ ] **RF4 — `POST /api/auth/logout`**: borra la cookie → `200 { message }`.
- [ ] **RF5 — `GET /api/auth/me`**: devuelve `{ user }` si hay cookie válida, `401` si no.
- [ ] **RF6 — `proxy.ts`** (en `src/`, Next 16): valida cookie JWT. API routes (excepto `/api/auth/*`) → `401 { error }` sin cookie; páginas (`/`, `/metas`, `/perfil`, `/onboarding`) → redirect `/login`. `/login` y `/register` → redirect `/` si la cookie es válida. Excluir assets estáticos (`_next/static`, `_next/image`, `favicon.ico`) del matcher.
- [ ] **RF7 — Páginas `/login` y `/register`**: formularios con email/password, labels, loading state en submit, errores del server visibles, responsive 320→1920px, estética Tremor existente.
- [ ] **RF8 — Header**: mostrar email de la sesión (vía `/api/auth/me`) + botón logout.
- [ ] **RF9 — Sesión**: cookie `auth_token`, `httpOnly`, `sameSite: 'lax'`, `maxAge` 7 días, `path: '/'`.
- [ ] **RF10 — Helper de sesión**: función compartida para firmar/verificar JWT (`src/lib/session.ts`) usada por API routes y proxy. Payload: `{ sub: userId }`.
- [ ] **RF11 — Tests de lógica de negocio** (constitución §1.3): hash/verify de contraseña y firma/verificación de token. **Requerirá sumar vitest** (ver §9 Riesgos).

## 6. Requisitos no funcionales

- **Seguridad**:
  - bcryptjs (hash con salt propio de la librería, cost default).
  - `JWT_SECRET` SOLO vía `process.env` (nunca hardcodeado); `.env.example` ya tiene placeholder.
  - Zod en TODAS las rutas auth (constitución §1.4).
  - Errores de login genéricos (evitar email enumeration).
  - Respuestas `{ error: string }` con status HTTP apropiado (patrón existente).
- **Performance**: login/register < 300ms en local; verificación JWT en proxy sin tocar DB (solo crypto).
- **Accesibilidad/UX**: labels, `type="password"`, `required`, errores inline con `aria-describedby`, loading states.
- **TypeScript strict**: sin `any`. Sin secretos en respuestas ni logs.

## 7. Criterios de aceptación (DoD)

- [ ] Dado un usuario sin sesión, cuando visita `/`, entonces es redirigido a `/login`.
- [ ] Dado un usuario sin sesión, cuando llama a `GET /api/transactions`, entonces recibe `401 { error }`.
- [ ] Dado el registro con password de menos de 8 caracteres, cuando se envía, entonces recibe `400` con error de validación.
- [ ] Dado un registro exitoso, cuando se completa, entonces la cookie `auth_token` está seteada y `GET /api/auth/me` devuelve el usuario.
- [ ] Dado que ya existe un usuario, cuando se intenta registrar otro, entonces recibe `409`.
- [ ] Dado el login con credenciales correctas, cuando se envía, entonces se setea la cookie y redirige a `/`.
- [ ] Dado el login con credenciales incorrectas, entonces recibe `401 { error: "Credenciales inválidas" }` (mensaje genérico).
- [ ] Dado el logout, cuando se ejecuta, entonces la cookie se borra y `/` redirige a `/login`.
- [ ] Dado un usuario logueado, cuando recarga la página, entonces la sesión persiste (cookie httpOnly).
- [ ] Dado un usuario logueado, cuando visita `/login`, entonces es redirigido a `/`.
- [ ] Dado el código, cuando corre `npm run build` y `npm run lint`, entonces no hay errores TS strict ni warnings de ESLint.
- [ ] Dado el proxy, cuando se navega, entonces los assets estáticos (CSS/JS/imágenes) NO se bloquean.

## 8. Dependencias

- **Constitución check** (amend ya aplicado):
  - §1.1 auth pasa a módulo central ✅
  - §1.2 auth: "JWT propio (bcryptjs + jsonwebtoken), credenciales email/password. Futuro: Google OAuth" ✅
  - §1.4: bcryptjs, JWT en cookie httpOnly, protección vía middleware/proxy ✅
  - §2.4 (nueva): single-user, primer registro crea el usuario, posteriores devuelven error ✅
  - §3: "Google OAuth / proveedores externos" pasó a fuera de alcance ✅
- Paquetes: `bcryptjs@3.0.3` y `jsonwebtoken@9` (YA instalados). Posible `vitest` (ver §9).
- `JWT_SECRET` con valor REAL en `.env` (generar con `openssl rand -base64 32`). Sin esto, login/registro fallan.
- Next 16.3: `proxy.ts` reemplaza `middleware` (deprecado). No existe aún `src/proxy.ts` (la carpeta `src/middleware/` está vacía y se descarta).
- Patrón existente a reutilizar: `connectDB()` en `src/lib/db.ts`, manejo de errores `{ error }` en API routes.

## 9. Riesgos / Incertidumbres

- **`@types/bcryptjs` (v2) vs bcryptjs 3.0.3**: bcryptjs 3 trae tipos propios; el stub v2 puede conflictuar en TS strict → desinstalar `@types/bcryptjs` si pasa.
- **Tests**: la constitución §1.3 exige tests (70% en lógica de negocio) y NO hay test runner instalado → sumar `vitest` es dependencia nueva (justificada por la propia constitución). Si el usuario prefiere posponer tests, el plan debe declararlo explícitamente como deuda.
- **`src/middleware/` vacía**: era un placeholder de estructura; `proxy.ts` debe crear el archivo y la carpeta middleware sobra (decidir si se borra).
- **Onboarding**: `/onboarding` existe y hoy se accede libremente. Con auth pasa a protegida; hay que verificar que el flujo registro → onboarding → dashboard no se rompe (el seed ya crea categorías).
- **JWT en proxy**: verify sin importar modelos de Mongoose (solo crypto + `JWT_SECRET`). Proxy corre en Node runtime (Next 16) → `jsonwebtoken` es compatible.
- **Nombre de cookie vs `.env.example`**: `.env.example` menciona `NEXTAUTH_SECRET`/`NEXTAUTH_URL` (reliquia de NextAuth) → actualizar placeholders para reflejar `JWT_SECRET` y cookie `auth_token`.

## 10. Out of Scope (explícito)

- Google OAuth / proveedores externos (constitución §3 — spec futura)
- Refresh tokens / invalidation server-side de sesiones
- Password reset / email de verificación
- Multi-usuario, roles, permisos
- 2FA, rate limiting en login (nota: localhost, riesgo bajo; evaluar si se quiere)
