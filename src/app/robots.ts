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