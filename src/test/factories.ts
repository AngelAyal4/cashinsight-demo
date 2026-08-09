import type {
  BudgetProgress,
  CurrencyCode,
  ICategory,
  ITransaction,
  TransactionKind,
} from '@/types';

export function makeCategory(overrides: Partial<ICategory> = {}): ICategory {
  return {
    _id: '64b8f0000000000000000002',
    name: 'Compras',
    type: 'expense',
    color: '#a3e635',
    icon: 'shoppingBag',
    behavior: 'variable',
    ...overrides,
  };
}

export function makeTransaction(overrides: Partial<ITransaction> = {}): ITransaction {
  return {
    _id: '64b8f0000000000000000010',
    amount: 5000,
    description: 'Compra supermercado',
    category: makeCategory(),
    type: 'expense',
    date: new Date('2026-07-15'),
    ...overrides,
  };
}

export function makeBudgetProgress(
  overrides: Partial<BudgetProgress> = {}
): BudgetProgress {
  return {
    _id: '64b8f0000000000000000001',
    amount: 50000,
    period: 'monthly',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-31'),
    usedAmount: 25000,
    usagePercent: 50,
    status: 'sano',
    category: makeCategory(),
    ...overrides,
  };
}

export function mockFetchOk<T>(data: T): Response {
  return {
    ok: true,
    json: async () => data,
  } as Response;
}

export function mockFetchError(status: number, error: string): Response {
  return {
    ok: false,
    status,
    json: async () => ({ error }),
  } as Response;
}

export function makeCurrency(): CurrencyCode {
  return 'ARS';
}

export function makeKind(): TransactionKind {
  return 'expense';
}
