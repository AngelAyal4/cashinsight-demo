// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHeader } from '@/components/layout/app-header';

vi.mock('next/navigation', () => ({
  usePathname: () => '/control',
}));

describe('AppHeader', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ name: 'Usuario Test' }),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra los 4 links de navegación por rol', () => {
    render(<AppHeader />);
    const links = screen.getAllByRole('link', { name: /Principal|Control|Metas|Reportes/ });
    expect(links).toHaveLength(4);
  });

  it('el link Control tiene clase activa bg-lime', () => {
    render(<AppHeader />);
    const controlLink = screen.getByRole('link', { name: 'Control' });
    expect(controlLink.classList.toString()).toContain('bg-lime');
  });

  it('el link Principal NO tiene clase activa', () => {
    render(<AppHeader />);
    const principalLink = screen.getByRole('link', { name: 'Principal' });
    expect(principalLink.classList.toString()).not.toContain('bg-lime');
  });
});
