// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CoupleBalanceCard } from '@/components/dashboard/couple-balance-card';
import type { CoupleBalance } from '@/types';

function makeBalance(overrides: Partial<CoupleBalance> = {}): CoupleBalance {
  return {
    paidByMe: 10000,
    paidByPartner: 6000,
    net: 4000,
    status: 'te-deben',
    ...overrides,
  };
}

describe('CoupleBalanceCard', () => {
  it('muestra que la pareja te debe y ofrece liquidar', async () => {
    const onSettle = vi.fn();
    render(
      <CoupleBalanceCard
        balance={makeBalance()}
        currency="ARS"
        onSettle={onSettle}
      />
    );

    expect(screen.getByText(/Tu pareja te debe/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Liquidar' }));
    expect(onSettle).toHaveBeenCalledTimes(1);
  });

  it('muestra que le debés a tu pareja', () => {
    render(
      <CoupleBalanceCard
        balance={makeBalance({ paidByMe: 2000, paidByPartner: 5000, net: -3000, status: 'debes' })}
        currency="ARS"
        onSettle={vi.fn()}
      />
    );

    expect(screen.getByText(/Le debés/)).toBeInTheDocument();
  });

  it('oculta el botón Liquidar cuando el balance está saldado', () => {
    render(
      <CoupleBalanceCard
        balance={makeBalance({ paidByMe: 5000, paidByPartner: 5000, net: 0, status: 'saldado' })}
        currency="ARS"
        onSettle={vi.fn()}
      />
    );

    expect(screen.getByText('Están saldados')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Liquidar' })).toBeNull();
  });
});
