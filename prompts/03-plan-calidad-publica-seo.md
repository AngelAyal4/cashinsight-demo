# Plan — Calidad pública, metadata y SEO pre-deploy

> Rol del ejecutor: ejecutar este plan de punta a punta. NO modificar `AGENTS.md`, `constitution.md`, `.env*` ni la spec. Sin features fuera de spec (sin landing pública, sin multiidioma, sin Search Console).
> Espec fuente: `specs/calidad-publica-seo.md`. Prompt origen: `prompts/01-orquestador-calidad-publica-seo.md`.

## 0. Hechos verificados por el orquestador (no re-investigar)

- Stack real: **Next.js 16.3.0 + React 19**, App Router. La auth vive en `src/proxy.ts` (convención nueva de middleware en Next 16). Repo en `main`, node v22.23.1 / npm 10.9.8.
- `src/app/layout.tsx`: metadata global mínima (`title: "CashinsightApp"`, description global), `<html lang="es">`, fonts Geist, `<PwaRegister />`. Sin `metadataBase`, OG, canonical ni robots.
- **Todas las páginas privadas son Client Components** (`'use client'` en `/`, `/control`, `/metas`, `/perfil`, `/report`, `/help`, `/onboarding`) → **no pueden exportar `metadata`**; la metadata de esas rutas va en **`layout.tsx` de segmento** (server component que retorna `{children}`).
- `/login` y `/register` **son Server Components** → exportan `metadata` directo desde `page.tsx`.
- No existen `src/app/not-found.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts` ni `public/llms.txt`. Sí existen `src/app/favicon.ico`, `src/app/manifest.ts` (iconos SVG declarados), `public/icon.svg`, `public/icon-maskable.svg`, `public/sw.js`.
- Docs Next 16 (`node_modules/next/dist/docs/`) confirman: `robots.ts`/`sitemap.ts` son route handlers cacheados que devuelven `MetadataRoute.Robots`/`MetadataRoute.Sitemap`; root `app/not-found.tsx` maneja URLs no matcheadas y **Next inyecta automáticamente `<meta name="robots" content="noindex">` en respuestas 404**; 404 streamed puede devolver 200 → verificar status contra **build de producción (`next start`)**, no solo dev.
- El proxy deja pasar `/robots.txt`, `/sitemap.xml`, `/llms.txt` (no son `/api`, ni páginas protegidas) → **no requiere cambios**.
- Tests: vitest, `environment: 'node'` global, jsdom vía pragma `// @vitest-environment jsdom`, `fileParallelism: false` (Mongo real `cashinsightapp_test`), coverage con `include` explícito y thresholds 70/70/70/70. **Todo archivo `src/` nuevo que se agregue al `include` debe tener tests o baja el gate.**
- Host tiene `python3` + **Pillow 10.2.0** y `ffmpeg` → la imagen OG se genera sin dependencias npm.
- `NEXT_PUBLIC_APP_URL=http://localhost:3000` ya está en `.env.example`.
- `evidencia/` está gitignored; convención: `evidencia/<feature>/<nn>-<nombre>.log` con salidas crudas (`tee`).
- Los SVG de scaffold (`public/next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`) no se referencian en el código. **Nota opcional fuera de scope**: borrarlos en un commit aparte solo si el usuario lo pide; no es requisito de la spec.

## 1. Política de indexación (CERRADA — no debatir en ejecución)

**No existe ninguna ruta indexable en el MVP.** No se inventa ninguna.

| Ruta | Clase | meta `robots` | robots.txt | sitemap | canonical | OG | JSON-LD |
|---|---|---|---|---|---|---|---|
| `/login` | pública-auth | `noindex, nofollow` | permitida | no | no | **sí** (brand) | **sí** (`WebApplication`) |
| `/register` | pública-auth | `noindex, nofollow` | permitida | no | no | **sí** (brand) | no |
| `/` | privada | `noindex, nofollow` | permitida (ver nota) | no | no | no | no |
| `/control`, `/metas`, `/perfil`, `/report`, `/help`, `/onboarding` | privadas | `noindex, nofollow` | `Disallow` | no | no | no | no |
| `/api/*` | API | n/a | `Disallow: /api/` | no | no | no | no |
| rutas inexistentes | 404 | noindex automático (Next) | n/a | no | no | no | no |
| `/manifest.webmanifest`, `/sw.js`, `/favicon.ico`, `/icon*.svg`, `/og.png`, `/llms.txt`, `/robots.txt`, `/sitemap.xml` | funcionales | n/a | permitidas | no | no | n/a | no |

**Nota sobre `/` en robots.txt (decisión cerrada):** `Disallow: /` bloquearía el sitio completo (prohibido explícitamente por la spec §2). `/` sin sesión devuelve **307 a `/login`** vía proxy, nunca contenido. Por eso `/` NO va en `Disallow`; se documenta así en el comentario del código y en la evidencia.

**Canonical:** no se agrega en ninguna ruta (spec: "canonical solo a rutas que la política permita indexar"). El criterio 11 de la checklist global queda **N/A — sin rutas indexables en MVP**, justificación documentada en evidencia.

**Sitemap vacío justificado:** sin rutas indexables, `sitemap.ts` devuelve `[]` (urlset XML válido y vacío) con comentario en el código: *"MVP sin rutas indexables; listar aquí solo rutas públicas indexables cuando existan (nunca privadas ni /api)"*.

## 2. Verificaciones previas (gates — si algo falla, STOP)

| # | Comando | Esperado |
|---|---|---|
| 2.1 | `git status --short` y `git branch --show-current` | vacío / `main` |
| 2.2 | `docker compose ps` | `cashinsight-mongo` running (los tests usan Mongo real) |
| 2.3 | `npm run test` | verde (registrar cantidad exacta de tests como baseline) |
| 2.4 | `npm run lint` / `npx tsc --noEmit` / `npm run build` | verdes |
| 2.5 | Baseline HTTP contra `npm run start` tras build: `curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3000/robots.txt` (idem `/sitemap.xml`, `/llms.txt`, `/ruta-inexistente`) y `curl -sS http://localhost:3000/login \| grep -iE '<title>'` | registrar 404 actuales de robots/sitemap/llms y título global único |

Guardar todo en `evidencia/calidad-publica-seo/00-baseline.log`.

## 3. Cambios de código (orden de implementación)

### Fase 1 — Metadata raíz: `src/app/layout.tsx` (modificar)

Cambio único del bloque `metadata` (mantener fonts, `lang="es"`, `<PwaRegister />` intactos):

```ts
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'CashinsightApp — Metas de ahorro y gastos, mes a mes',
    template: '%s — CashinsightApp',
  },
  description: 'Gestioná tus metas de ahorro y tus gastos de forma simple y brutalista.',
  robots: { index: false, follow: false }, // política base segura: app privada
};
```

- `metadataBase` desde `NEXT_PUBLIC_APP_URL` con fallback localhost **solo para dev**. Nunca hardcodear URL Vercel.
- Política base `noindex, nofollow` en raíz: defensa en profundidad; cada segmento la reafirma explícito (auditabilidad).

### Fase 2 — Metadata pública auth: login + register

**`src/app/login/page.tsx`** (agregar export, sin tocar el JSX existente salvo el script JSON-LD):

```ts
export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Ingresá a CashinsightApp para ver tu presupuesto del mes, tus límites de gasto y tus metas de ahorro.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'CashinsightApp',
    description: 'Gestioná tus metas de ahorro y tus gastos de forma simple y brutalista.',
    type: 'website',
    url: '/login',
    siteName: 'CashinsightApp',
    locale: 'es_AR',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'CashinsightApp — finanzas personales mensuales' }],
  },
};
```

JSON-LD dentro del JSX (server component, contenido 100% literal controlado, sin datos de usuario):

```tsx
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'CashinsightApp',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  inLanguage: 'es',
  description: 'App privada de presupuestos personales: ingresos, límites de gasto, metas de ahorro y reportes mensuales.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
};
// en el JSX, dentro de <main>:
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

**`src/app/register/page.tsx`**: mismo patrón de metadata con `title: 'Crear cuenta'`, description propia ("Registrá tu única cuenta…"), mismo bloque `openGraph` con `url: '/register'`, **sin JSON-LD** (evitar duplicados).

### Fase 3 — Metadata de páginas privadas: layouts de segmento (crear)

Crear `src/app/<segmento>/layout.tsx` para `control`, `metas`, `perfil`, `report`, `help` y `onboarding`. **`/` NO crea layout**: la página raíz hereda `title.default` y `noindex` base del root layout (decisión cerrada).

Patrón exacto para cada uno de los 6 segmentos:

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '<Título único>',
  description: '<Description única>',
  robots: { index: false, follow: false },
};

export default function <Segmento>Layout({ children }: LayoutProps<'/<segmento>'>) {
  return children;
}
```

Títulos/descriptions cerrados (copiar tal cual):

| Segmento | title | description |
|---|---|---|
| `/control` | `Control` | `Límites de gasto por categoría variable: definí topes y seguí tu progreso del mes.` |
| `/metas` | `Metas` | `Tus objetivos de ahorro con progreso, aportes y retiros.` |
| `/perfil` | `Perfil` | `Tu información financiera, monedas, reparto de gastos y cuenta.` |
| `/report` | `Reportes` | `Historial de meses cerrados: cada cierre compacta tus movimientos en un snapshot.` |
| `/help` | `Ayuda` | `Cómo usar CashinsightApp: mapa de la app, ciclo mensual, guías y preguntas frecuentes.` |
| `/onboarding` | `Configuración inicial` | `Armá tu plan financiero: ingresos, gastos estimados y metas de ahorro.` |

`LayoutProps<'/control'>` es el tipo global de Next 16 (mismo patrón que `LayoutProps<"/">` en el root layout).

### Fase 4 — 404 propia: `src/app/not-found.tsx` (crear)

Server component, **cero dependencias de datos/API/Mongo**, renderiza dentro del root layout (fonts + CSS brutalista aplican solas):

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-12 text-ink">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-lime">Error 404</p>
        <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight">Página no encontrada</h1>
        <p className="mt-3 text-sm font-medium text-ink/70">
          La ruta que buscás no existe o fue movida.
        </p>
        <Link href="/login" className="btn-brutal mt-6 inline-block">
          Ir a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
```

- Un único `<h1>`, landmark `<main>`, enlace funcional a ruta pública (`/login`).
- No exportar `metadata` (Next inyecta `noindex` automático en 404; hereda el título default).
- Verificación de status **contra `next start`** (build producción), no solo dev (en dev streamed puede verse distinto).

### Fase 5 — Imagen OG: `public/og.png` (crear)

- **1200×630 PNG** (nunca SVG: compatibilidad desigual en redes).
- Generación con **Python + Pillow del sistema** (ya instalado, NO es dependencia npm ni de runtime): script **`scripts/generate-og-image.py`** versionado y re-ejecutable. Diseño: fondo `#f2efe6` (paper), marco brutalista `#111111`, bloque `#a3e635` (lime) con `$`, texto `CashinsightApp` + tagline. Fuente: TTF bold del sistema (buscar `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf` con fallback `ImageFont.load_default()`). Sin datos de usuario.
- Correr `python3 scripts/generate-og-image.py` → `file public/og.png` debe reportar `1200 x 630`.

### Fase 6 — robots, sitemap, llms

**`src/app/robots.ts`** (crear):

```ts
import type { MetadataRoute } from 'next';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // App privada: se excluyen superficies privadas y APIs de forma ESPECÍFICA.
      // '/' NO se excluye: sin sesión redirige 307 a /login (Disallow: / bloquearía todo el sitio).
      disallow: ['/api/', '/control', '/metas', '/perfil', '/report', '/help', '/onboarding'],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
```

**`src/app/sitemap.ts`** (crear):

```ts
import type { MetadataRoute } from 'next';

// MVP sin rutas indexables: sitemap válido y vacío a propósito.
// Listar aquí SOLO rutas públicas indexables cuando existan. Nunca privadas, /api, manifest ni sw.js.
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
```

**`public/llms.txt`** (crear, estático, ≤ 20 líneas, sin emails/nombres/balances/URLs internas privadas):

```txt
# CashinsightApp

> App web privada y single-user de finanzas personales: presupuesto mensual,
> límites de gasto variable, metas de ahorro y reportes de cierre mensual.
> Interfaz en español.

## Superficies públicas

- /login — inicio de sesión (noindex)
- /register — registro de cuenta única (noindex)

## Notas

- El resto de la app requiere sesión y no es indexable.
- /api/* no es pública.
```

### Fase 7 — Tests (sin dependencias nuevas)

**`src/test/public-metadata.test.ts`** (environment node default; importar funciones/objetos, no renderizar):

1. `robots()` devuelve `userAgent: '*'`, `allow: '/'`, `disallow` que contiene exactamente `/api/` + los 6 segmentos privados, y **no contiene** `'/'` suelto; `sitemap` termina en `/sitemap.xml`.
2. `sitemap()` devuelve array; en MVP `length === 0`; guard: ningún entry podría contener `/api/`, `/control`, `/metas`, `/perfil`, `/report`, `/help`, `/onboarding`.
3. Root `metadata`: `metadataBase` es `URL` con href `http://localhost:3000/` (fallback dev); `title.template` contiene `%s`; `robots.index === false`.
4. Con `vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://cashinsight.vercel.app')` + `vi.resetModules()` + dynamic import: `metadataBase.href === 'https://cashinsight.vercel.app/'` (prueba que prod no queda en localhost).
5. Metadata de segmentos: importar `metadata` de los 6 `layout.tsx` + `login/page.tsx` + `register/page.tsx` → cada uno tiene `title`/`description` **únicos entre sí**, `robots.index === false`; login y register tienen `openGraph.images[0].url === '/og.png'` y `width: 1200`.

**`src/app/not-found.test.tsx`** (pragma `// @vitest-environment jsdom`, patrón de los component tests existentes):

6. Render de `NotFound`: exactamente un `h1` ("Página no encontrada"), un link con `href="/login"`, sin fetch ni mocks.

**`vitest.config.ts`**: agregar `'src/app/robots.ts'` y `'src/app/sitemap.ts'` al `coverage.include` (convención del repo). No agregar layouts/not-found al include (JSX de presentación, mismo criterio que componentes existentes).

### Fase 8 — `.env.example` (modificar, solo comentario)

Agregar al bloque Vercel: `# NEXT_PUBLIC_APP_URL=https://<proyecto>.vercel.app   (requerida en producción: metadataBase, canonical OG y sitemap derivan de ella)`. Sin valores reales.

## 4. Comportamiento esperado por ruta (resumen ejecutable)

| Ruta | Esperado post-implementación |
|---|---|
| `/login` | 200, `<title>Iniciar sesión — CashinsightApp</title>`, description propia, `noindex,nofollow`, OG completo con `/og.png`, JSON-LD válido, `lang="es"` |
| `/register` | 200, título distinto de login, description de registro, `noindex,nofollow`, OG |
| `/`, `/control`, … (sin sesión) | 307 → `/login` (proxy intacto); con sesión: HTML con su título único + `noindex,nofollow` |
| ruta inexistente | **404** real + UI propia + un H1 + link a `/login` |
| `/robots.txt` | 200, `text/plain`, reglas específicas, sin `Disallow: /`, línea `Sitemap:` absoluta |
| `/sitemap.xml` | 200, XML válido (urlset vacío) |
| `/llms.txt` | 200, texto sin datos privados |
| `/og.png` | 200, `image/png`, 1200×630 |

## 5. Plan de verificación (comando → evidencia en `evidencia/calidad-publica-seo/`)

Preparación: `rm -rf .next && NEXT_PUBLIC_APP_URL=https://cashinsight-test.vercel.app npm run build && NEXT_PUBLIC_APP_URL=https://cashinsight-test.vercel.app npm run start &` (usar `next start`, no dev).

| # | Verificación | Esperado | Evidencia |
|---|---|---|---|
| 5.1 | `curl -sS http://localhost:3000/login` → grep `<title`, `description`, `robots`, `og:`, `canonical`, `lang=`, `<h1`, `ld+json` | todos presentes; robots `noindex, nofollow`; **sin canonical**; og:image absoluta con la URL de prueba | `10-login-html.log` |
| 5.2 | idem `/register` | título ≠ login | `11-register-html.log` |
| 5.3 | `curl -sS -o /dev/null -w '%{http_code}' http://localhost:3000/` (sin cookie) | `307` a `/login` | `12-redirect-privadas.log` |
| 5.4 | `curl -sS -o /tmp/404.html -w '%{http_code}\n' http://localhost:3000/ruta-inexistente` + grep H1/link | `404` + un `<h1>` + `href="/login"` | `13-404.log` |
| 5.5 | `curl -sS http://localhost:3000/robots.txt` | reglas exactas, sin `Disallow: /` suelto | `14-robots.log` |
| 5.6 | `curl -sS http://localhost:3000/sitemap.xml` + `python3 -c "import xml.dom.minidom,sys; xml.dom.minidom.parseString(sys.stdin.read())"` | XML parsea, cero `<loc>` | `15-sitemap.log` |
| 5.7 | `curl -sS http://localhost:3000/llms.txt` | 200; grep negativo de `prueba@`, `mongodb`, `JWT` | `16-llms.log` |
| 5.8 | `curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' http://localhost:3000/og.png` + `file public/og.png` | 200, `image/png`, 1200×630 | `17-og-image.log` |
| 5.9 | `grep -c 'localhost:3000'` sobre los HTML/robots/sitemap descargados en 5.1–5.6 | **0** (build fue con URL de prueba) | `18-no-localhost.log` |
| 5.10 | JSON-LD: extraer el script de 5.1 y `python3 -m json.tool` | JSON válido, `@type: WebApplication`, sin emails | `19-jsonld.log` |
| 5.11 | Gates: `npm run test && npm run test:coverage && npx tsc --noEmit && npm run lint && npm run build && npm audit --audit-level=high` | todos verdes; coverage ≥70% con los 2 archivos nuevos incluidos | `20-gates.log` |

Cerrar el server (`kill %1`) al terminar.

## 6. Riesgos a vigilar

- **`metadataBase` mal configurado** → canonicals/OG con localhost en producción. Mitigación: build de verificación con `NEXT_PUBLIC_APP_URL` seteada (5.9) + recordatorio en `.env.example` (Fase 8). En Vercel la var debe existir **antes del build** (las `NEXT_PUBLIC_*` se inlinan en build time).
- **Indexación accidental de privadas**: ninguna página privada puede exportar metadata sin `robots: { index: false, follow: false }`; el test 5 compara unicidad y política. El proxy sigue siendo el control de acceso real — robots.txt no es seguridad.
- **Filtración de datos**: OG/JSON-LD/llms.txt solo contienen literales de marca. Prohibido interpolar datos de usuario, Mongo o request. Revisión manual en 5.7/5.10.
- **404 con status 200 en dev** (streaming): verificar siempre contra `next start` (5.4).
- **OG en SVG**: no usar; PNG 1200×630 generado por script versionado (Fase 5).
- **Coverage**: si se olvida agregar `robots.ts`/`sitemap.ts` al `include`, el gate de coverage puede quedar inconsistente; si se agregan layouts al include sin tests, baja el porcentaje.
- **No tocar**: `manifest.ts`, `favicon.ico`, `icon*.svg`, `sw.js`, headers de `/sw.js` en `next.config.ts`, `proxy.ts`.

## 7. Evidencia para el review

`evidencia/calidad-publica-seo/` (gitignored) con `00-baseline.log` + los logs `10`–`20` de la tabla §5, **salidas crudas de comandos reales** (`<comando> 2>&1 | tee evidencia/calidad-publica-seo/<nombre>.log`). Prohibido describir en vez de adjuntar. Además: diff final limpio de secretos (`git diff | grep -iE 'mongodb|JWT_SECRET'` → solo placeholders).