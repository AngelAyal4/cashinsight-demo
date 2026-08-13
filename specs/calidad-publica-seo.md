---
name: calidad-publica-seo
description: "Superficie pública, metadata, SEO y 404 de CashinsightApp antes de Vercel."
---

# SPEC — Calidad pública, metadata y SEO pre-deploy

> Estado: propuesta para orquestador/ejecutor
> Prioridad: alta
> Fecha: 2026-08-13
> Dependencia: `constitution.md`, `SECURITY-CHECKLIST.md` (20 controles de calidad pública)

## 1. Problema

La app tiene metadata global mínima y no tiene una política explícita para la superficie pública:

- todas las rutas heredan el título `CashinsightApp`;
- la descripción es global, no específica por ruta;
- no hay Open Graph, canonical, JSON-LD, `robots.txt`, `sitemap.xml` ni `llms.txt`;
- existe la 404 generada por Next, pero no una 404 diseñada por el proyecto;
- el dashboard es una aplicación privada single-user, por lo que no se debe indexar ni exponer información personal.

El objetivo no es aplicar SEO indiscriminado a pantallas privadas. El objetivo es que cada ruta tenga una política explícita: indexable y compartible si es pública, o `noindex`/excluida si requiere sesión.

## 2. Solución propuesta

Implementar una capa de metadata y superficies públicas nativas de Next.js App Router, sin agregar dependencias:

1. Crear una página 404 propia y coherente con la UI brutalista.
2. Definir `metadataBase` desde `NEXT_PUBLIC_APP_URL`, manteniendo `http://localhost:3000` en desarrollo y usando la URL Vercel configurada en producción.
3. Reemplazar el título global único por títulos descriptivos por segmento, con `title.template` solo cuando no destruya la unicidad.
4. Agregar descriptions específicas por ruta.
5. Agregar Open Graph con una imagen estática válida de 1200×630.
6. Agregar JSON-LD únicamente para la aplicación pública, sin datos financieros, nombres de usuarios ni contenido privado.
7. Agregar canonical solo a rutas que la política permita indexar.
8. Crear `robots.txt`, `sitemap.xml` y `llms.txt` con una política explícita para una app privada.

### Política de indexación cerrada

CashinsightApp no tiene actualmente una landing pública separada. Por lo tanto:

- `/login` y `/register`: superficies públicas de autenticación; metadata descriptiva, pero `noindex, nofollow` para no convertirlas en páginas de búsqueda.
- `/`, `/control`, `/metas`, `/perfil`, `/report`, `/help`, `/onboarding`: privadas; `noindex, nofollow` y excluidas de `robots.txt` y `sitemap.xml`.
- `/api/*`: nunca indexable; excluida de `robots.txt`.
- `/manifest.webmanifest`, `/sw.js`, favicon e iconos: funcionales, no páginas indexables.
- `/llms.txt`: describe la aplicación de forma general y no contiene datos de usuario.
- `sitemap.xml`: debe existir y listar solo rutas explícitamente indexables. Si no existe ninguna ruta indexable en el MVP, devolver un sitemap XML válido sin rutas privadas, documentando ese motivo.
- No usar `Disallow: /` como bloqueo genérico a buscadores o agentes de IA. La exclusión debe ser específica por superficie privada.

## 3. Usuarios afectados

- Visitantes no autenticados que llegan a `/login`, `/register` o una ruta inexistente.
- Usuarios autenticados, que no deben ver datos privados indexados ni filtrados en metadata/social previews.
- Buscadores, agentes de IA y crawlers que consultan las superficies públicas.
- Equipo de deploy que necesita una política verificable antes de publicar en Vercel.

## 4. Flujos de usuario

1. Visitante abre `/login` → recibe HTML SSR con título y descripción específicos, idioma `es`, favicon y política `noindex`.
2. Visitante abre `/register` → recibe metadata específica de registro, sin datos privados.
3. Visitante abre una URL inexistente → recibe 404 personalizada, status HTTP `404`, un único H1, enlace funcional a `/login` y apariencia coherente con la app.
4. Crawler consulta `/robots.txt` → recibe reglas explícitas: APIs y rutas privadas excluidas, sin bloqueo global accidental de IA.
5. Crawler consulta `/sitemap.xml` → recibe XML válido con cero o más URLs exclusivamente públicas/indexables.
6. Agente consulta `/llms.txt` → recibe descripción controlada de CashinsightApp sin credenciales, nombres, movimientos, balances ni URLs internas.
7. Usuario comparte una ruta pública habilitada → Open Graph apunta a una imagen válida y no filtra información privada.

## 5. Requisitos funcionales

- [ ] Crear `src/app/not-found.tsx` con layout de la app, un único `<h1>`, mensaje útil, status 404 real y enlace a una ruta pública válida.
- [ ] Actualizar `src/app/layout.tsx` para definir `metadataBase` a partir de `NEXT_PUBLIC_APP_URL` y una política base segura.
- [ ] Definir metadata específica para cada página HTML relevante: `/login`, `/register`, `/`, `/control`, `/metas`, `/perfil`, `/report`, `/help` y `/onboarding`.
- [ ] Evitar que las rutas privadas hereden metadata que las haga parecer indexables.
- [ ] Definir `title`, `description` y `robots` de manera coherente por ruta.
- [ ] Crear una imagen Open Graph estática en `public/` con formato y dimensiones aceptadas por redes sociales; no incluir información de usuario.
- [ ] Agregar `openGraph` para las superficies que puedan compartirse sin filtrar datos privados.
- [ ] Agregar JSON-LD de tipo apropiado para una aplicación web, sin afirmar funcionalidades inexistentes ni incluir datos personales.
- [ ] Agregar canonical absoluto únicamente en rutas explícitamente indexables; usar la URL configurada, nunca una URL Vercel hardcodeada.
- [ ] Crear `src/app/robots.ts` con reglas específicas para APIs y rutas privadas.
- [ ] Crear `src/app/sitemap.ts` que no liste ninguna ruta privada, API, manifest, service worker ni URL con datos de usuario.
- [ ] Crear `public/llms.txt` con contenido general, breve y mantenible.
- [ ] Mantener `lang="es"`, favicon, manifest e iconos existentes.
- [ ] No agregar Vite, React Router, librerías SEO ni otro framework; usar metadata nativa de Next.js.

## 6. Requisitos no funcionales

- **Seguridad:** ningún metadata, OG image, JSON-LD, sitemap o `llms.txt` puede incluir email, nombre, movimientos, balances, metas, categorías personalizadas, tokens o URLs privadas.
- **Privacidad:** páginas privadas deben indicar `noindex, nofollow`; `robots.txt` no se considera control de acceso.
- **Accesibilidad:** 404 y todas las páginas HTML deben tener un único H1 significativo, landmarks semánticos y enlaces navegables por teclado.
- **Internacionalización:** el documento conserva `<html lang="es">`.
- **Serverless:** no usar filesystem, generación dinámica dependiente de Mongo ni secretos para producir metadata pública.
- **Compatibilidad:** no introducir dependencias npm nuevas.
- **Performance:** metadata y archivos estáticos no deben agregar JavaScript cliente innecesario.

## 7. Criterios de aceptación

- [ ] Dado `/login`, cuando se obtiene el HTML inicial, entonces contiene un `<title>` descriptivo, una description específica, `lang="es"`, favicon y una política `noindex` coherente.
- [ ] Dado `/register`, cuando se obtiene el HTML inicial, entonces el título no es idéntico al de login y la description explica registro, sin datos privados.
- [ ] Dado `/`, `/control`, `/metas`, `/perfil`, `/report`, `/help` u `/onboarding`, cuando se consulta sin sesión, entonces la protección existente sigue redirigiendo a `/login` y no se entrega contenido financiero.
- [ ] Dado una ruta inexistente, cuando se consulta con `curl`, entonces responde HTTP `404`, contiene la 404 propia, un H1 y un enlace funcional a `/login`.
- [ ] Dado `/robots.txt`, cuando se consulta, entonces responde HTTP `200` con `Content-Type` correcto y reglas específicas para rutas privadas/API, sin `Disallow: /` global.
- [ ] Dado `/sitemap.xml`, cuando se consulta, entonces responde HTTP `200`, XML válido y no incluye rutas privadas, API, manifest, service worker ni query strings de usuario.
- [ ] Dado `/llms.txt`, cuando se consulta, entonces responde HTTP `200` y su contenido no contiene secretos ni datos de la cuenta de desarrollo.
- [ ] Dado una superficie habilitada para compartir, cuando se inspecciona metadata, entonces `og:title`, `og:description`, `og:type`, `og:url` y `og:image` son coherentes y la imagen responde `200`.
- [ ] Dado una ruta con JSON-LD, cuando se parsea el script, entonces es JSON válido, el tipo es apropiado y no hay datos privados.
- [ ] Dado una ruta canonicalizable, cuando se inspecciona el HTML, entonces el canonical es absoluto y usa `NEXT_PUBLIC_APP_URL`, no localhost ni una URL efímera hardcodeada.
- [ ] Dado el build con `NEXT_PUBLIC_APP_URL` de producción, cuando se inspeccionan las rutas, entonces no aparece `http://localhost:3000` en canonical, OG o sitemap.
- [ ] `npm run test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` y `npm audit --audit-level=high` permanecen verdes.

## 8. Dependencias

- `src/app/layout.tsx` y `src/app/manifest.ts` existentes.
- `NEXT_PUBLIC_APP_URL` ya documentada en `.env.example`.
- Proxy/auth actual para distinguir rutas públicas y privadas.
- Checklist global: `/home/compu/workflow-stack/SECURITY-CHECKLIST.md`.
- Deploy posterior: `specs/deploy-vercel-atlas.md`.

## 9. Riesgos / Incertidumbres

- Una app privada sin landing pública tiene poco valor SEO; no se debe inventar una superficie indexable solo para marcar el checklist.
- `robots.txt` no impide acceso a datos: la autorización debe seguir dependiendo de proxy y API.
- `metadataBase` mal configurado puede generar canonicals localhost o de la URL temporal Vercel.
- OG image en SVG puede tener compatibilidad desigual; preferir PNG/JPG 1200×630 para redes sociales.
- La página 404 no debe depender de datos de Mongo ni romper si el backend está caído.

## 10. Out of Scope (explícito)

- Crear una landing comercial pública.
- Hacer indexables el dashboard, reportes, metas, perfil o datos financieros.
- Google Search Console, Bing Webmaster Tools o campañas SEO.
- Multiidioma.
- Generar metadata personalizada desde MongoDB.
- Exponer información de la cuenta de prueba en cualquier archivo público.
