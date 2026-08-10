import { describe, expect, it } from 'vitest';
import { computeFinancialHealth } from '@/lib/financial-metrics';

const baseInput = {
  monthlyIncome: 100000,
  plannedSavings: 20000,
  fixedExpenses: 60000,
  variableExpenses: 20000,
};

describe('computeFinancialHealth', () => {
  it.each([
    [80000, 20000, 'perfecto'],
    [80000, 10000, 'bien'],
    [95000, 5000, 'revisar'],
    [105000, 0, 'cuidado'],
    [120000, 0, 'alerta'],
  ])('clasifica el estado %s', (expense, savings, expectedLevel) => {
    const result = computeFinancialHealth({
      ...baseInput,
      monthlyExpense: expense,
      monthlySavings: savings,
    });

    expect(result.level).toBe(expectedLevel);
  });
});
