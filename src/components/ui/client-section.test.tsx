// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClientSection } from '@/components/ui/client-section';

describe('ClientSection', () => {
  it('muestra children', () => {
    render(
      <ClientSection>
        <p>Contenido visible</p>
      </ClientSection>
    );
    expect(screen.getByText('Contenido visible')).toBeInTheDocument();
  });

  it('aplica aria-label cuando se pasa label', () => {
    render(<ClientSection label="Mi sección">Contenido</ClientSection>);
    expect(screen.getByLabelText('Mi sección')).toBeInTheDocument();
  });
});
