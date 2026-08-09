---
name: spec-recuperacion-password
description: "Spec aprobada: recuperación de contraseña local con token de un solo uso mostrado en la consola del server."
---

# SPEC — Recuperación de contraseña (token local)

## 1. Problema
La app es single-user local (localhost, sin SMTP ni deploy). Si el usuario olvida su contraseña, hoy no hay forma de recuperarla sin acceso manual a la base. El flujo actual solo permite cambiarla estando logueado (requiere la contraseña actual).

## 2. Solución propuesta
Mecanismo **sin email**: `POST /api/auth/forgot` genera un token de un solo uso con TTL de 15 minutos, lo imprime en la **consola del server** (patrón estándar de apps self-hosted), y el usuario lo carga en `/login` junto con su contraseña nueva en `POST /api/auth/reset`.

**Decisión de alcance:** el envío por email (SMTP) queda fuera — cuando haya deploy y SMTP real, el mismo mecanismo de token se conecta a un mailer (cambio de delivery, no de diseño).

## 3. Usuarios afectados
- Único usuario local, deslogueado u olvidado de su contraseña.

## 4. Flujos de usuario
1. En `/login`, el usuario toca "¿Olvidaste tu contraseña?".
2. La app le muestra: "Corré el pedido de recuperación desde tu terminal y copiá el token que aparece en la consola" (instrucciones concretas) + botón/acción "Pedir token".
3. `POST /api/auth/forgot` genera el token, lo imprime en consola (`[RECUPERACIÓN] Tu token (válido 15 min): ...`) y la UI lo confirma ("Token generado — mirá la consola del server").
4. El usuario pega el token + su contraseña nueva en el form → `POST /api/auth/reset` → contraseña actualizada → se loguea con la nueva.

## 5. Requisitos funcionales
- [ ] **RF1** `POST /api/auth/forgot` (sin sesión requerida):
  - Valida que exista el usuario único (si no existe, responde 200 genérico igual — no revela estado).
  - Genera un token aleatorio de 32 bytes (hex), firmado como JWT con `purpose: 'reset'`, `sub: userId`, `exp: now + 15 min` (secret de `JWT_SECRET` existente — sin dependencias nuevas).
  - Guarda el **hash** del token (SHA-256) + `expiresAt` en el documento `User` (campos opcionales `passwordResetTokenHash`, `passwordResetExpiresAt`).
  - Imprime en `console.log` el token plano + instrucción ("válido 15 minutos, un solo uso").
  - Responde `200 { message: 'Token de recuperación generado (revisá la consola del server)' }`.
- [ ] **RF2** `POST /api/auth/reset` (sin sesión requerida):
  - Body: `{ token: string, newPassword: string }` (password con las mismas reglas de registro: min 8, max 200).
  - Verifica: firma JWT válida, `purpose === 'reset'`, `sub` coincide, token no expirado, y el hash SHA-256 del token coincide con `passwordResetTokenHash` del usuario.
  - Actualiza `passwordHash` con bcryptjs; **borra** los campos de reset (token one-time).
  - Destruye la cookie de sesión actual si existe (el usuario podría haber quedado con sesión de un browser viejo — limpieza defensiva; las demás cookies expiran por su maxAge).
  - Respuestas: 400 token inválido/expirado/ya usado ("El token es inválido o expiró. Pedí uno nuevo."), 200 éxito.
- [ ] **RF3** UI en `/login`: link/texto "¿Olvidaste tu contraseña?" que muestra una vista en dos pasos:
  - Paso 1: botón "Pedir token" + instrucción de revisar la consola.
  - Paso 2 (tras confirmar el back): form `Token` + `Contraseña nueva` + botón "Restablecer".
  - Éxito → mensaje y redirección a login (o login directo con la nueva contraseña — decidir en implementación: redirección al login es más simple y segura).
- [ ] **RF4** Seguridad:
  - El token es one-time (se borra al usarlo), expira a los 15 min, y se guarda SOLO su hash (nunca el plano en DB).
  - La respuesta de `forgot` es genérica (no distingue usuario existente vs no).
  - `reset` no crea sesión: el usuario debe loguearse con la nueva contraseña (mínima superficie).
- [ ] **RF5** Tests aditivos (en `src/test/api-routes.test.ts` o archivo propio `src/test/password-reset.test.ts`, environment node + Mongo real como el resto):
  - Forgot genera token y lo imprime (mock de console.log o captura de stdout).
  - Reset con token válido → login con la contraseña NUEVA funciona; con la VIEJA falla (401).
  - Reset con token ya usado → 400 (one-time).
  - Reset con token expirado (viaje en el tiempo o TTL corto inyectable) → 400.
  - Reset con token inválido/forjado → 400.
  - Forgot sin usuario (app vacía) → 200 genérico.

## 6. Requisitos no funcionales
- Sin dependencias npm nuevas (jsonwebtoken + crypto ya disponibles).
- `console.log` SOLO del token (nunca de la contraseña ni hashes).
- El flujo normal (login/register/cambio de contraseña logueado) no cambia en nada.
- Regresión 0 sobre auth existente (153 tests intactos).

## 7. Criterios de aceptación
- [ ] Dado `/login` → "¿Olvidaste tu contraseña?", cuando pido el token, entonces veo el token en la consola del server y el back responde 200.
- [ ] Dado un token válido, cuando lo uso con una contraseña nueva de ≥ 8 caracteres, entonces se actualiza y puedo loguearme con la nueva (y la vieja falla).
- [ ] Dado el mismo token, cuando intento usarlo dos veces, entonces el segundo intento responde 400.
- [ ] Dado un token expirado o inventado, cuando lo uso, entonces 400 con mensaje claro.
- [ ] Dado la suite, cuando corro `npm test`, entonces 153 + nuevos pasan; `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## 8. Dependencias
- Modelo `User` (+2 campos opcionales), 2 API routes nuevas, vista en `/login`, tests. Sin dependencias npm.

## 9. Riesgos / Incertidumbres
- **Consola como canal**: en localhost es aceptable y es el patrón de las apps self-hosted. Documentarlo en `/help` ("¿Olvidaste tu contraseña?") con el paso a paso exacto para leer la consola (dónde corre el server).
- **Sesiones viejas tras el reset**: no se invalidan activamente (el JWT no tiene versión de contraseña). En localhost single-user, aceptable; documentar en la spec que al deployar con multi-usuario habrá que rotar/versionar.
- **Tokens y logs**: el token plano vive solo en el log del server 15 minutos; guardar únicamente el hash en DB.

## 10. Out of Scope (explícito)
- **NO** envío por email/SMTP (futuro: mismo token, delivery por mailer).
- **NO** preguntas de seguridad, 2FA, ni recuperación por SMS.
- **NO** invalidación activa de sesiones existentes.
- **NO** cambios en register/login/logout ni en el flujo de cambio de contraseña logueado.