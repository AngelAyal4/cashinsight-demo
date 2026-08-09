import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cashinsight',
    short_name: 'Cashinsight',
    description:
      'Gestioná tus metas de ahorro y tus gastos de forma simple y brutalista.',
    lang: 'es',
    start_url: '/',
    display: 'standalone',
    background_color: '#f2efe6',
    theme_color: '#a3e635',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
