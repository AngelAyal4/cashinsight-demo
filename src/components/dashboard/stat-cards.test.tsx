// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/stat-cards';

describe('StatCard', () => {
  it('muestra label y valor', () => {
    render(<StatCard label="Ingresos" value="$ 50.000" />);
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('$ 50.000')).toBeInTheDocument();
  });
});

describe('StatCardSkeleton', () => {
  it('renderiza sin crash', () => {
    const { container } = render(<StatCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
