// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotFound from '@/app/not-found';

describe('NotFound', () => {
  it('renderiza un unico h1, un main y un enlace funcional a /login', () => {
    const { container } = render(<NotFound />);

    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: /Página no encontrada/ })
    ).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Ir a iniciar sesión/ });
    expect(link).toHaveAttribute('href', '/login');

    expect(container.querySelector('main')).not.toBeNull();
  });
});