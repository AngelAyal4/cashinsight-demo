import type { MetadataRoute } from 'next';

// MVP sin rutas indexables: sitemap válido y vacío a propósito.
// Listar aquí SOLO rutas públicas indexables cuando existan. Nunca privadas, /api, manifest ni sw.js.
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}