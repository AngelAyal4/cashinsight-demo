import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectDB } from '@/lib/db';
import { AUTH_COOKIE_NAME, signSessionToken } from '@/lib/session';
import { hashPassword } from '@/lib/password';
import { getMonthKey } from '@/lib/monthly-date';
import { Budget } from '@/models/Budget';
import { Category } from '@/models/Category';
import { FinancialProfile } from '@/models/FinancialProfile';
import { MonthlySnapshot } from '@/models/MonthlySnapshot';
import { SavingsGoal } from '@/models/SavingsGoal';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { POST as transactionsPOST } from '@/app/api/transactions/route';
import { PATCH as transactionPATCH } from '@/app/api/transactions/[id]/route';
import { GET as summaryGET } from '@/app/api/reports/summary/route';
import type { CoupleBalance } from '@/types';

const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, string>() }));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name) as string } : undefined,
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
}));

const API_URL = 'http://localhost';

function jsonRequest(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown
): Request {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

async function cleanDatabase(): Promise<void> {
  await Promise.all([
    User.deleteMany({}),
    FinancialProfile.deleteMany({}),
    Transaction.deleteMany({}),
    SavingsGoal.deleteMany({}),
    Category.deleteMany({}),
    Budget.deleteMany({}),
    MonthlySnapshot.deleteMany({}),
  ]);
}

async function createUserWithSession(): Promise<string> {
  await User.init();
  const user = await User.create({
    email: 'pareja@example.com',
    passwordHash: await hashPassword('password123'),
  });
  cookieJar.set(AUTH_COOKIE_NAME, signSessionToken({ sub: user._id.toString() }));
  return user._id.toString();
}

interface Fixtures {
  expenseCategory: string;
  incomeCategory: string;
}

async function createFixtures(): Promise<Fixtures> {
  const [expenseCategory, incomeCategory] = await Promise.all([
    Category.create({
      name: 'Hogar',
      type: 'expense',
      color: '#a3e635',
      behavior: 'variable',
    }),
    Category.create({ name: 'Sueldo', type: 'income', color: '#22c55e' }),
  ]);

  await FinancialProfile.create({
    name: 'Test',
    monthlyIncome: 200000,
    incomeAccuracy: 'exact',
    fixedExpenses: 0,
    variableExpenses: 0,
    emergencyFundMonths: 3,
    baseCurrency: 'ARS',
    savingsCurrency: 'ARS',
    onboardingCompleted: true,
    activeMonth: getMonthKey(),
  });

  return {
    expenseCategory: expenseCategory._id.toString(),
    incomeCategory: incomeCategory._id.toString(),
  };
}

async function createExpense(
  category: string,
  amount: number,
  paidBy?: 'yo' | 'pareja' | 'compartido'
): Promise<Response> {
  return transactionsPOST(
    jsonRequest(`${API_URL}/api/transactions`, 'POST', {
      type: 'expense',
      amount,
      description: 'Gasto del hogar',
      category,
      ...(paidBy ? { paidBy } : {}),
    })
  );
}

async function createSettlement(
  amount: number,
  paidBy: 'yo' | 'pareja'
): Promise<Response> {
  return transactionsPOST(
    jsonRequest(`${API_URL}/api/transactions`, 'POST', {
      type: 'settlement',
      amount,
      description: 'Liquidación',
      paidBy,
    })
  );
}

async function getSummary(): Promise<Record<string, unknown>> {
  const response = await summaryGET();
  expect(response.status).toBe(200);
  return (await response.json()) as Record<string, unknown>;
}

async function getCoupleBalance(): Promise<CoupleBalance> {
  const summary = await getSummary();
  return summary.coupleBalance as CoupleBalance;
}

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Transacciones con paidBy (validación)', () => {
  let fixtures: Fixtures;

  beforeEach(async () => {
    await cleanDatabase();
    cookieJar.clear();
    await createUserWithSession();
    fixtures = await createFixtures();
  });

  it('crea un gasto con paidBy y lo persiste', async () => {
    const response = await createExpense(fixtures.expenseCategory, 10000, 'compartido');

    expect(response.status).toBe(201);
    const created = (await response.json()) as Record<string, unknown>;
    expect(created.paidBy).toBe('compartido');
  });

  it('crea un gasto sin paidBy con el valor null por defecto (regresión)', async () => {
    const response = await createExpense(fixtures.expenseCategory, 5000);

    expect(response.status).toBe(201);
    const created = (await response.json()) as Record<string, unknown>;
    expect(created.paidBy).toBeNull();
  });

  it('rechaza paidBy en un ingreso', async () => {
    const response = await transactionsPOST(
      jsonRequest(`${API_URL}/api/transactions`, 'POST', {
        type: 'income',
        amount: 100000,
        description: 'Sueldo',
        category: fixtures.incomeCategory,
        paidBy: 'yo',
      })
    );

    expect(response.status).toBe(400);
  });

  it('rechaza paidBy en un ahorro', async () => {
    const goal = await SavingsGoal.create({
      name: 'Viaje',
      goalType: 'travel',
      targetAmount: 100000,
      currency: 'ARS',
      priority: 'high',
      isEmergency: false,
      plannedMonthlyAmount: 10000,
      active: true,
    });

    const response = await transactionsPOST(
      jsonRequest(`${API_URL}/api/transactions`, 'POST', {
        type: 'saving',
        amount: 1000,
        description: 'Aporte',
        goal: goal._id.toString(),
        paidBy: 'pareja',
      })
    );

    expect(response.status).toBe(400);
  });

  it('rechaza una liquidación sin paidBy', async () => {
    const response = await transactionsPOST(
      jsonRequest(`${API_URL}/api/transactions`, 'POST', {
        type: 'settlement',
        amount: 4000,
        description: 'Liquidación',
      })
    );

    expect(response.status).toBe(400);
  });

  it('rechaza una liquidación con paidBy "compartido"', async () => {
    const response = await transactionsPOST(
      jsonRequest(`${API_URL}/api/transactions`, 'POST', {
        type: 'settlement',
        amount: 4000,
        description: 'Liquidación',
        paidBy: 'compartido',
      })
    );

    expect(response.status).toBe(400);
  });

  it('rechaza una liquidación con monto menor o igual a cero', async () => {
    const response = await transactionsPOST(
      jsonRequest(`${API_URL}/api/transactions`, 'POST', {
        type: 'settlement',
        amount: 0,
        description: 'Liquidación',
        paidBy: 'yo',
      })
    );

    expect(response.status).toBe(400);
  });

  it('crea una liquidación sin categoría ni meta', async () => {
    const response = await createSettlement(4000, 'yo');

    expect(response.status).toBe(201);
    const created = (await response.json()) as Record<string, unknown>;
    expect(created.type).toBe('settlement');
    expect(created.paidBy).toBe('yo');
    expect(created.category ?? null).toBeNull();
    expect(created.goal ?? null).toBeNull();
  });
});

describe('Edición de transacciones con paidBy', () => {
  let fixtures: Fixtures;

  beforeEach(async () => {
    await cleanDatabase();
    cookieJar.clear();
    await createUserWithSession();
    fixtures = await createFixtures();
  });

  it('actualiza el paidBy de un gasto existente', async () => {
    const created = (await (
      await createExpense(fixtures.expenseCategory, 8000, 'yo')
    ).json()) as Record<string, unknown>;

    const response = await transactionPATCH(
      jsonRequest(`${API_URL}/api/transactions/${created._id}`, 'PATCH', {
        paidBy: 'pareja',
      }),
      routeContext(String(created._id))
    );

    expect(response.status).toBe(200);
    const updated = (await response.json()) as Record<string, unknown>;
    expect(updated.paidBy).toBe('pareja');
  });

  it('conserva el paidBy cuando se guarda sin cambiarlo', async () => {
    const created = (await (
      await createExpense(fixtures.expenseCategory, 8000, 'compartido')
    ).json()) as Record<string, unknown>;

    const response = await transactionPATCH(
      jsonRequest(`${API_URL}/api/transactions/${created._id}`, 'PATCH', {
        description: 'Gasto del hogar editado',
      }),
      routeContext(String(created._id))
    );

    expect(response.status).toBe(200);
    const updated = (await response.json()) as Record<string, unknown>;
    expect(updated.paidBy).toBe('compartido');
  });

  it('limpia el paidBy al convertir un gasto en ingreso', async () => {
    const created = (await (
      await createExpense(fixtures.expenseCategory, 8000, 'yo')
    ).json()) as Record<string, unknown>;

    const response = await transactionPATCH(
      jsonRequest(`${API_URL}/api/transactions/${created._id}`, 'PATCH', {
        type: 'income',
        category: fixtures.incomeCategory,
      }),
      routeContext(String(created._id))
    );

    expect(response.status).toBe(200);
    const updated = (await response.json()) as Record<string, unknown>;
    expect(updated.paidBy).toBeNull();
  });

  it('rechaza asignar paidBy a un movimiento que no es gasto', async () => {
    const created = (await (
      await transactionsPOST(
        jsonRequest(`${API_URL}/api/transactions`, 'POST', {
          type: 'income',
          amount: 50000,
          description: 'Sueldo',
          category: fixtures.incomeCategory,
        })
      )
    ).json()) as Record<string, unknown>;

    const response = await transactionPATCH(
      jsonRequest(`${API_URL}/api/transactions/${created._id}`, 'PATCH', {
        paidBy: 'yo',
      }),
      routeContext(String(created._id))
    );

    expect(response.status).toBe(400);
  });

  it('rechaza dejar una liquidación sin paidBy', async () => {
    const created = (await (await createSettlement(4000, 'yo')).json()) as Record<
      string,
      unknown
    >;

    const response = await transactionPATCH(
      jsonRequest(`${API_URL}/api/transactions/${created._id}`, 'PATCH', {
        paidBy: null,
      }),
      routeContext(String(created._id))
    );

    expect(response.status).toBe(400);
  });
});

describe('Balance de pareja en el resumen', () => {
  let fixtures: Fixtures;

  beforeEach(async () => {
    await cleanDatabase();
    cookieJar.clear();
    await createUserWithSession();
    fixtures = await createFixtures();
  });

  it('sin gastos de pareja devuelve el balance en cero (regresión)', async () => {
    await createExpense(fixtures.expenseCategory, 7000);

    const summary = await getSummary();
    const balance = summary.coupleBalance as CoupleBalance;

    expect(balance).toEqual({
      paidByMe: 0,
      paidByPartner: 0,
      net: 0,
      status: 'saldado',
    });
    expect(summary.monthlyExpense).toBe(7000);
  });

  it('calcula el neto entre lo que puso cada uno', async () => {
    await createExpense(fixtures.expenseCategory, 10000, 'yo');
    await createExpense(fixtures.expenseCategory, 6000, 'pareja');

    const balance = await getCoupleBalance();

    expect(balance.paidByMe).toBe(10000);
    expect(balance.paidByPartner).toBe(6000);
    expect(balance.net).toBe(4000);
    expect(balance.status).toBe('te-deben');
  });

  it('divide los gastos compartidos 50/50', async () => {
    await createExpense(fixtures.expenseCategory, 10000, 'compartido');

    const balance = await getCoupleBalance();

    expect(balance.paidByMe).toBe(5000);
    expect(balance.paidByPartner).toBe(5000);
    expect(balance.status).toBe('saldado');
  });

  it('la liquidación ajusta el neto sin tocar ingresos ni gastos', async () => {
    await createExpense(fixtures.expenseCategory, 10000, 'yo');
    await createExpense(fixtures.expenseCategory, 6000, 'pareja');

    const before = await getSummary();
    expect((before.coupleBalance as CoupleBalance).net).toBe(4000);

    await createSettlement(4000, 'yo');
    const after = await getSummary();

    expect((after.coupleBalance as CoupleBalance).net).toBe(0);
    expect((after.coupleBalance as CoupleBalance).status).toBe('saldado');
    expect(after.monthlyIncome).toBe(before.monthlyIncome);
    expect(after.monthlyExpense).toBe(before.monthlyExpense);
    expect(after.monthlyBalance).toBe(before.monthlyBalance);
    expect(after.monthlySavings).toBe(before.monthlySavings);
    expect(after.totalBalance).toBe(before.totalBalance);
    expect(after.totalFixed).toBe(before.totalFixed);
    expect(after.totalVariable).toBe(before.totalVariable);
    expect(after.availableToSpend).toBe(before.availableToSpend);
    expect(after.perDayRemaining).toBe(before.perDayRemaining);
    expect(after.savingsRate).toBe(before.savingsRate);
    expect(after.financialScore).toEqual(before.financialScore);
    expect(after.incomeDistribution).toEqual(before.incomeDistribution);
  });

  it('las liquidaciones parciales dejan el saldo restante', async () => {
    await createExpense(fixtures.expenseCategory, 10000, 'yo');
    await createSettlement(3000, 'yo');

    const balance = await getCoupleBalance();

    expect(balance.net).toBe(7000);
    expect(balance.status).toBe('te-deben');
  });

  it('una liquidación a favor de la pareja invierte la dirección del neto', async () => {
    await createExpense(fixtures.expenseCategory, 5000, 'pareja');
    await createSettlement(5000, 'pareja');

    const balance = await getCoupleBalance();

    expect(balance.net).toBe(0);
    expect(balance.status).toBe('saldado');
  });

  it('el gasto sin paidBy no participa del balance pero sí del presupuesto', async () => {
    await createExpense(fixtures.expenseCategory, 12000);
    await createExpense(fixtures.expenseCategory, 4000, 'yo');

    const summary = await getSummary();
    const balance = summary.coupleBalance as CoupleBalance;

    expect(summary.monthlyExpense).toBe(16000);
    expect(balance.paidByMe).toBe(4000);
    expect(balance.paidByPartner).toBe(0);
  });
});
