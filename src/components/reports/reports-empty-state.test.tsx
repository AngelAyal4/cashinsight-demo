// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportsEmptyState } from '@/components/reports/reports-empty-state';

describe('ReportsEmptyState', () => {
  it('muestra el heading "Aún no hay reportes"', () => {
    render(<ReportsEmptyState />);
    expect(
      screen.getByRole('heading', { name: /Aún no hay reportes/ })
    ).toBeInTheDocument();
  });
});
