// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsDetail } from '@/components/reports/reports-detail';
import type { IMonthlySnapshot } from '@/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function makeSnapshot(overrides: Partial<IMonthlySnapshot> = {}): IMonthlySnapshot {
  return {
    _id: '64b8f0000000000000000099',
    monthKey: '2026-07',
    currency: 'ARS',
    range: { start: '2026-07-01', end: '2026-07-31' },
    income: 100000,
    expenses: 60000,
    savings: 20000,
    balance: 40000,
    totalFixed: 35000,
    totalVariable: 25000,
    expensesByCategory: [
      {
        category: 'cat1',
        name: 'Alimentación',
        color: '#a3e635',
        icon: 'utensils',
        behavior: 'fijo',
        total: 30000,
        percentage: 50,
      },
      {
        category: 'cat2',
        name: 'Transporte',
        color: '#7c3aed',
        icon: 'car',
        behavior: 'variable',
        total: 15000,
        percentage: 25,
      },
    ],
    budgetCompliance: [
      {
        budget: 'budget1',
        category: 'cat1',
        categoryName: 'Compras',
        color: '#a3e635',
        amount: 50000,
        usedAmount: 25000,
        usagePercent: 50,
        status: 'sano',
      },
    ],
    goals: [
      {
        goal: 'goal1',
        name: 'Fondo de emergencia',
        currency: 'ARS',
        amount: 5000,
        targetAmount: 100000,
        currentAmount: 30000,
        progressPercentage: 30,
      },
    ],
    financialScore: 80,
    scoreMessage: null,
    transactionsCount: 12,
    metrics: {
      topSpendingDay: null,
      averageDailyExpense: 0,
    },
    ...overrides,
  };
}

describe('ReportsDetail', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderiza balance y categorías con datos', async () => {
    const snapshot = makeSnapshot();
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => snapshot,
    });

    render(<ReportsDetail monthKey="2026-07" />);

    await screen.findByText('Balance del mes');

    expect(screen.getByText('Alimentación')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
    expect(screen.getByText(/Sano/)).toBeInTheDocument();
    expect(screen.getByText('Fondo de emergencia')).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('estado sin datos: muestra error y link Volver', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Reporte no encontrado' }),
    });

    render(<ReportsDetail monthKey="2026-06" />);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Volver al historial')).toBeInTheDocument();
  });
});
