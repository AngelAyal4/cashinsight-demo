import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextConfig } from 'next';

async function loadConfig(): Promise<NextConfig> {
  vi.resetModules();
  const mod = (await import('../../next.config')) as { default: NextConfig };
  return mod.default;
}

afterEach(() => {
  delete process.env.VERCEL;
});

describe('next.config.ts (hardening runtime pre-deploy)', () => {
  it('deshabilita el header X-Powered-By', async () => {
    const config = await loadConfig();

    expect(config.poweredByHeader).toBe(false);
  });

  it('usa output standalone sin VERCEL y undefined con VERCEL=1', async () => {
    delete process.env.VERCEL;
    const localConfig = await loadConfig();
    expect(localConfig.output).toBe('standalone');

    process.env.VERCEL = '1';
    const vercelConfig = await loadConfig();
    expect(vercelConfig.output).toBeUndefined();
  });

  it('declara los headers de /sw.js', async () => {
    const config = await loadConfig();

    expect(typeof config.headers).toBe('function');
    const headers = (await config.headers?.()) ?? [];
    const swRule = headers.find((rule) => rule.source === '/sw.js');

    expect(swRule).toBeDefined();
    expect(swRule?.headers).toEqual(
      expect.arrayContaining([
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      ])
    );
  });
});