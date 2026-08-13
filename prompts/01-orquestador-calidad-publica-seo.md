# Orquestador — Calidad pública, metadata y SEO pre-deploy

Rol: **orquestador**. NO escribas código, NO edites archivos del proyecto y NO ejecutes la implementación. Solo leé, analizá y producí un PLAN accionable para un ejecutor posterior.

## Objetivo

Transformar `specs/calidad-publica-seo.md` en un plan de implementación verificable para CashinsightApp antes del deploy a Vercel.

## Lecturas obligatorias

Leé primero:

- `AGENTS.md`
- `constitution.md`
- `specs/calidad-publica-seo.md`
- `specs/deploy-vercel-atlas.md`
- `src/app/layout.tsx`
- todas las páginas `src/app/**/page.tsx`
- `src/app/manifest.ts`
- `src/proxy.ts`
- `next.config.ts`
- `.env.example`
- `.gitignore`
- `package.json`
- contenido de `public/`

Podés leer otros archivos si necesitás fundamentar el plan. NUNCA leas ni incluyas en el plan: `.env`, `.env.*`, `node_modules/`, `.next/`, backups o secretos.

Si está disponible en el entorno, consultá también la checklist global:

```text
/home/compu/workflow-stack/SECURITY-CHECKLIST.md
```

## Contexto ya auditado

Confirmá con lecturas, pero no vuelvas a investigar desde cero estos hechos:

- El stack es Next.js 16 App Router + React 19; no es Vite.
- `src/app/layout.tsx` tiene metadata global con título `CashinsightApp`, una description global y `<html lang="es">`.
- No existen actualmente `src/app/not-found.tsx`, `src/app/robots.ts` ni `src/app/sitemap.ts`.
- No existe `public/llms.txt`.
- No hay Open Graph, canonical ni JSON-LD en la metadata actual.
- Existe `src/app/favicon.ico` y el manifest ya declara iconos PWA.
- Las páginas auditadas tienen un único H1.
- El dashboard es privado y single-user; no se deben indexar balances, movimientos, metas, reportes, perfil ni datos de usuario.
- La URL `*.vercel.app` es válida como staging/prueba, pero no reemplaza un dominio propio para publicación definitiva.

## Tu tarea

Producí un plan fásico que haga implementable la spec sin inventar una landing pública ni forzar SEO sobre rutas privadas.

El plan debe cubrir, en este orden lógico:

1. **Baseline y política de indexación**
   - Cómo verificar el estado actual.
   - Qué rutas son públicas, privadas, noindexables o indexables.
   - Qué hacer si no existe ninguna ruta indexable: sitemap válido sin rutas privadas, documentando el motivo.
   - Cómo evitar que canonical, OG, sitemap o JSON-LD filtren datos.

2. **Metadata base y por ruta**
   - Cambios exactos en `src/app/layout.tsx`.
   - Páginas que deben exportar `metadata` o `generateMetadata`.
   - Uso de `metadataBase` con `NEXT_PUBLIC_APP_URL`; nunca hardcodear localhost ni una URL efímera.
   - Títulos y descriptions únicos.
   - Política `robots: noindex, nofollow` en pantallas privadas/auth según la spec.

3. **404 propia**
   - Crear `src/app/not-found.tsx`.
   - Mantener HTML semántico, un único H1, enlace funcional y ausencia de dependencia de Mongo/API.
   - Verificar status HTTP 404 y contenido real.

4. **Open Graph, JSON-LD y assets**
   - Ubicación y formato de la imagen OG, preferentemente PNG/JPG 1200×630.
   - Metadata OG segura para superficies sin datos privados.
   - JSON-LD de tipo apropiado, sin afirmar funcionalidades inexistentes ni incluir información personal.
   - Mantener favicon, manifest e iconos existentes.

5. **Robots, sitemap y llms**
   - Crear `src/app/robots.ts` con exclusiones específicas para `/api/` y rutas privadas.
   - No usar un `Disallow: /` genérico que bloquee buscadores o agentes de IA por accidente.
   - Crear `src/app/sitemap.ts` sin rutas privadas; si queda vacío, justificarlo.
   - Crear `public/llms.txt` controlado, sin secretos, balances, emails, nombres ni datos de cuenta.

6. **Tests y evidencia**
   - Tests de metadata/404/superficies especiales usando el framework existente, sin dependencias nuevas.
   - Verificación HTTP con `curl` para cada ruta especial.
   - Verificación del HTML inicial: title, description, robots, canonical, OG, lang, H1.
   - Verificación de que no aparece `localhost:3000` en metadata de producción.
   - Revisión de sitemap/llms para asegurar que no listan datos privados.
   - Gates completos: `npm run test`, `npm run test:coverage`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm audit --audit-level=high`.

## Entregable

Escribí exclusivamente el plan en:

```text
prompts/03-plan-calidad-publica-seo.md
```

El plan debe incluir:

- archivos exactos a crear/modificar;
- orden de implementación;
- comportamiento esperado por ruta;
- tests nuevos o actualizados;
- comandos de verificación y resultados esperados;
- riesgos, especialmente metadataBase, indexación de rutas privadas y filtración de datos;
- evidencia que el ejecutor debe guardar para el review.

## Reglas estrictas

- NO implementes nada.
- NO modifiques `AGENTS.md`, `constitution.md`, `.env*` ni la spec.
- NO agregues dependencias npm.
- NO hagas indexable el dashboard por cumplir una lista genérica de SEO.
- NO inventes datos estructurados para pantallas privadas.
- NO sobrescribas otros planes: solo `prompts/03-plan-calidad-publica-seo.md`.
- El plan debe poder ejecutarse sin que el ejecutor tenga que decidir la política de indexación.
