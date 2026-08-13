import { afterAll, describe, expect, it, vi } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { metadata as loginMetadata } from '@/app/login/page';
import { metadata as registerMetadata } from '@/app/register/page';
import { metadata as controlMetadata } from '@/app/control/layout';
import { metadata as metasMetadata } from '@/app/metas/layout';
import { metadata as perfilMetadata } from '@/app/perfil/layout';
import { metadata as reportMetadata } from '@/app/report/layout';
import { metadata as helpMetadata } from '@/app/help/layout';
import { metadata as onboardingMetadata } from '@/app/onboarding/layout';
import type { Metadata } from 'next';
import type { MetadataRoute } from 'next';

vi.mock('next/font/google', () => ({
  Geist: () => ({ className: '' }),
  Geist_Mono: () => ({ className: '' }),
}));

const PRIVATE_SEGMENTS = ['/control', '/metas', '/perfil', '/report', '/help', '/onboarding'];

type RobotsRules = NonNullable<MetadataRoute.Robots['rules']> & {
  userAgent: string;
  allow: string;
  disallow: string[];
};

function metadataBaseHref(md: Metadata): string {
  const base = md.metadataBase;
  return base instanceof URL ? base.href : String(base);
}

function robotsPolicy(md: Metadata): { index?: boolean; follow?: boolean } {
  const robotsConfig = md.robots;
  return typeof robotsConfig === 'object' && robotsConfig !== null ? robotsConfig : {};
}

function firstOgImage(md: Metadata): { url?: unknown; width?: unknown } {
  const images = md.openGraph?.images;
  const first = Array.isArray(images) ? images[0] : images;
  return first && typeof first === 'object' ? (first as { url?: unknown; width?: unknown }) : {};
}

async function loadRootMetadata(appUrl: string | undefined): Promise<Metadata> {
  const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (appUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = appUrl;
  }

  vi.resetModules();

  try {
    const fresh = await import('@/app/layout');
    return (fresh as { metadata: Metadata }).metadata;
  } finally {
    if (previousAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    }
    vi.resetModules();
  }
}

describe('robots()', () => {
  it('permite la raiz y excluye API + segmentos privados, sin Disallow: /', () => {
    const result = robots();
    const rules = result.rules as RobotsRules;

    expect(rules.userAgent).toBe('*');
    expect(rules.allow).toBe('/');
    expect(rules.disallow).toEqual(
      expect.arrayContaining(['/api/', ...PRIVATE_SEGMENTS])
    );
    expect(rules.disallow).not.toContain('/');
  });

  it('sitemap es absoluto y termina en /sitemap.xml', () => {
    const result = robots();
    expect(result.sitemap).toBeDefined();
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});

describe('sitemap()', () => {
  it('devuelve un array vacio en MVP (sin rutas indexables)', () => {
    const result = sitemap();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it('nunca lista rutas privadas ni /api', () => {
    const result = sitemap();
    for (const entry of result) {
      expect(entry.url).not.toMatch(/\/api\//);
      expect(PRIVATE_SEGMENTS.some((segment) => entry.url.startsWith(segment))).toBe(
        false
      );
    }
  });
});

describe('metadata raiz', () => {
  it('metadataBase apunta al fallback de desarrollo', async () => {
    const rootMetadata = await loadRootMetadata(undefined);

    expect(rootMetadata.metadataBase).toBeInstanceOf(URL);
    expect(metadataBaseHref(rootMetadata)).toBe('http://localhost:3000/');
  });

  it('title.template contiene %s', async () => {
    const rootMetadata = await loadRootMetadata(undefined);
    const title = rootMetadata.title;

    expect(typeof title).toBe('object');
    expect(title).toMatchObject({ template: expect.stringContaining('%s') });
  });

  it('politica base noindex', async () => {
    const rootMetadata = await loadRootMetadata(undefined);

    expect(robotsPolicy(rootMetadata).index).toBe(false);
    expect(robotsPolicy(rootMetadata).follow).toBe(false);
  });

  it('en produccion metadataBase NO queda en localhost', async () => {
    const rootMetadata = await loadRootMetadata('https://cashinsight.vercel.app');

    expect(metadataBaseHref(rootMetadata)).toBe('https://cashinsight.vercel.app/');
  });
});

const SEGMENT_METADATA: Array<[string, Metadata]> = [
  ['/control', controlMetadata],
  ['/metas', metasMetadata],
  ['/perfil', perfilMetadata],
  ['/report', reportMetadata],
  ['/help', helpMetadata],
  ['/onboarding', onboardingMetadata],
];

describe('metadata de paginas', () => {
  it.each(SEGMENT_METADATA)('%s define title/description propios y noindex', (_segment, md) => {
    expect(typeof md.title).toBe('string');
    expect(typeof md.description).toBe('string');
    expect(robotsPolicy(md).index).toBe(false);
    expect(robotsPolicy(md).follow).toBe(false);
  });

  it('todos los titles y descriptions son unicos entre si', () => {
    const all = [loginMetadata, registerMetadata, ...SEGMENT_METADATA.map(([, md]) => md)];
    const titles = all.map((md) => String(md.title));
    expect(new Set(titles).size).toBe(titles.length);
    const descriptions = all.map((md) => String(md.description));
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('login y register tienen Open Graph con /og.png 1200x630 y noindex', () => {
    expect(firstOgImage(loginMetadata).url).toBe('/og.png');
    expect(firstOgImage(loginMetadata).width).toBe(1200);
    expect(firstOgImage(registerMetadata).url).toBe('/og.png');
    expect(firstOgImage(registerMetadata).width).toBe(1200);
    expect(robotsPolicy(loginMetadata).index).toBe(false);
    expect(robotsPolicy(registerMetadata).index).toBe(false);
  });
});

afterAll(() => {
  vi.unstubAllEnvs();
});