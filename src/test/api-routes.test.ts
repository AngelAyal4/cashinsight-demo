import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectDB } from '@/lib/db';
import { AUTH_COOKIE_NAME, signSessionToken } from '@/lib/session';
import { hashPassword } from '@/lib/password';
import { User } from '@/models/User';
import { Category } from '@/models/Category';
import { SavingsGoal } from '@/models/SavingsGoal';
import { Transaction } from '@/models/Transaction';
import { FinancialProfile } from '@/models/FinancialProfile';
import { Budget } from '@/models/Budget';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { GET as meGET } from '@/app/api/auth/me/route';
import { DELETE as accountDELETE } from '@/app/api/auth/account/route';
import { GET as categoriesGET, POST as categoriesPOST } from '@/app/api/categories/route';
import {
  GET as transactionsGET,
  POST as transactionsPOST,
} from '@/app/api/transactions/route';
import {
  DELETE as transactionDELETE,
  PATCH as transactionPATCH,
} from '@/app/api/transactions/[id]/route';
import { GET as goalsGET, POST as goalsPOST } from '@/app/api/goals/route';
import { DELETE as goalDELETE } from '@/app/api/goals/[id]/route';
import {
  GET as budgetsGET,
  POST as budgetsPOST,
} from '@/app/api/budgets/route';
import {
  DELETE as budgetDELETE,
  PATCH as budgetPATCH,
} from '@/app/api/budgets/[id]/route';
import { POST as onboardingPOST } from '@/app/api/onboarding/route';
import { GET as profileGET, PATCH as profilePATCH } from '@/app/api/profile/route';
import { POST as seedPOST } from '@/app/api/seed/route';
import { GET as summaryGET } from '@/app/api/reports/summary/route';

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
  ]);
}

async function createUserWithSession(email = 'test@example.com'): Promise<string> {
  await User.init();
  const user = await User.create({
    email,
    passwordHash: await hashPassword('password123'),
  });
  cookieJar.set(AUTH_COOKIE_NAME, signSessionToken({ sub: user._id.toString() }));
  return user._id.toString();
}

async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('API de autenticación', () => {
  beforeEach(async () => {
    await cleanDatabase();
    cookieJar.clear();
  });

  it('registra un usuario, normaliza el email y crea la cookie de sesión', async () => {
    const response = await registerPOST(
      jsonRequest(`${API_URL}/api/auth/register`, 'POST', {
        email: 'Mi@Email.com',
        password: 'password123',
      })
    );

    expect(response.status).toBe(201);
    const body = await bodyOf(response);
    expect((body.user as { email: string }).email).toBe('mi@email.com');
    expect(cookieJar.has(AUTH_COOKIE_NAME)).toBe(true);
  });

  it('rechaza un email ya registrado', async () => {
    await registerPOST(
      jsonRequest(`${API_URL}/api/auth/register`, 'POST', {
        email: 'test@example.com',
        password: 'password123',
      })
    );

    const response = await registerPOST(
      jsonRequest(`${API_URL}/api/auth/register`, 'POST', {
        email: 'test@example.com',
        password: 'password123',
      })
    );

    expect(response.status).toBe(409);
  });

  it('rechaza datos de registro inválidos', async () => {
    const response = await registerPOST(
      jsonRequest(`${API_URL}/api/auth/register`, 'POST', {
        email: 'no-es-email',
        password: 'corta',
      })
    );

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toHaveProperty('error');
  });

  it('rechaza credenciales incorrectas en el login', async () => {
    await createUserWithSession('a@b.com');
    cookieJar.clear();

    const response = await loginPOST(
      jsonRequest(`${API_URL}/api/auth/login`, 'POST', {
        email: 'a@b.com',
        password: 'incorrecta',
      })
    );

    expect(response.status).toBe(401);
  });

  it('autentica en el login y devuelve el usuario público', async () => {
    await createUserWithSession('a@b.com');
    cookieJar.clear();

    const response = await loginPOST(
      jsonRequest(`${API_URL}/api/auth/login`, 'POST', {
        email: 'a@b.com',
        password: 'password123',
      })
    );

    expect(response.status).toBe(200);
    const body = await bodyOf(response);
    expect((body.user as { email: string }).email).toBe('a@b.com');
    expect(cookieJar.has(AUTH_COOKIE_NAME)).toBe(true);
  });

  it('GET /api/auth/me devuelve el usuario con sesión y 401 sin sesión', async () => {
    await createUserWithSession('a@b.com');

    const authed = await meGET();
    expect(authed.status).toBe(200);
    const body = await bodyOf(authed);
    expect(body.user).toEqual({ _id: expect.any(String), email: 'a@b.com' });

    cookieJar.clear();
    const unauthed = await meGET();
    expect(unauthed.status).toBe(401);
  });

  it('logout destruye la cookie de sesión', async () => {
    await createUserWithSession('a@b.com');
    expect(cookieJar.has(AUTH_COOKIE_NAME)).toBe(true);

    const response = await logoutPOST();
    expect(response.status).toBe(200);
    expect(cookieJar.has(AUTH_COOKIE_NAME)).toBe(false);
  });

  it('elimina la cuenta con todos sus datos', async () => {
    const userId = await createUserWithSession('a@b.com');
    const category = await Category.create({ name: 'Deportes', type: 'expense' });
    await Transaction.create({
      amount: 100,
      description: 'Test',
      category: category._id.toString(),
      type: 'expense',
    });
    await FinancialProfile.create({
      name: 'Test',
      monthlyIncome: 1000,
      incomeAccuracy: 'exact',
      fixedExpenses: 500,
      variableExpenses: 100,
      baseCurrency: 'ARS',
      savingsCurrency: 'ARS',
    });

    const response = await accountDELETE();
    expect(response.status).toBe(200);

    expect(await User.findById(userId)).toBeNull();
    expect(await Category.countDocuments()).toBe(0);
    expect(await Transaction.countDocuments()).toBe(0);
    expect(await FinancialProfile.countDocuments()).toBe(0);
    expect(cookieJar.has(AUTH_COOKIE_NAME)).toBe(false);
  });
});

describe('API de categorías', () => {
  beforeEach(async () => {
    await cleanDatabase();
    cookieJar.clear();
  });

  it('devuelve 401 sin sesión', async () => {
    const response = await categoriesGET();
    expect(response.status).toBe(401);
  });

  it('crea los datos de ejemplo una única vez', async () => {
    await createUserWithSession();

    const first = await seedPOST();
    expect(first.status).toBe(201);
    expect(await Category.countDocuments()).toBe(13);
    expect(await Transaction.countDocuments()).toBe(10);

    const second = await seedPOST();
    expect(second.status).toBe(200);
    expect(await Category.countDocuments()).toBe(13);
    expect(await Transaction.countDocuments()).toBe(10);
  });

  it('lista categorías ordenadas con "Otro" al final', async () => {
    await createUserWithSession();
    await seedPOST();

    const response = await categoriesGET();
    expect(response.status).toBe(200);

    const list = (await response.json()) as { name: string }[];
    expect(list).toHaveLength(13);
    expect(list[list.length - 1].name).toBe('Otro');
    expect(list[list.length - 2].name).toBe('Otro');
  });

  it('crea una categoría personalizada', async () => {
    await createUserWithSession();

    const response = await categoriesPOST(
      jsonRequest(`${API_URL}/api/categories`, 'POST', {
        name: 'Deportes',
        type: 'expense',
      })
    );
    expect(response.status).toBe(201);

    const list = (await categoriesGET().then((response) => response.json())) as {
      name: string;
    }[];
    expect(list.some((item) => item.name === 'Deportes')).toBe(true);
  });
});

describe('API de transacciones (CRUD)', () => {
  beforeEach(async () => {
    await cleanDatabase();
    cookieJar.clear();
    await createUserWithSession();
    await seedPOST();
  });

  async function categoryId(name: string, type: 'income' | 'expense'): Promise<string> {
    const category = await Category.findOne({ name, type });
    if (!category) {
      throw new Error(`Categoría no encontrada: ${name}/${type}`);
    }
    return category._id.toString();
  }

  async function createActiveGoal(): Promise<string> {
    const goal = await SavingsGoal.create({
      name: 'Viaje',
      goalType: 'travel',
      targetAmount: 500000,
      currency: 'ARS',
      active: true,
    });
    return goal._id.toString();
  }

  it('crea una transacción de gasto con categoría poblada', async () => {
    const category = await categoryId('Alimentación', 'expense');

    const response = await transactionsPOST(
      jsonRequest(`${API_URL}/api/transactions`, 'POST', {
        amount: 2500,
        description: 'Mercado',
        type: 'expense',
        category,
      })
    );

    expect(response.status).toBe(201);
    const body = await bodyOf(response);
    expect(body).toEqual(
      expect.objectContaining({
        amount: 2500,
        description: 'Mercado',
        type: 'expense',
        category: expect.objectContaining({ name: 'Alimentación' }),
      })
    );
  });

  it('rechaza una transacción cuya categoría no coincide con el tipo', async () => {
    const category = await categoryId('Sueldo', 'income');

    const response = await transactionsPOST(
      jsonRequest(`${API_URL}/api/transactions`, 'POST', {
        amount: 2500,
        description: 'Raro',
        type: 'expense',
        category,
      })
    );

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toHaveProperty('error');
  });

  it('rechaza una transacción con monto inválido', async () => {
    const category = await categoryId('Alimentación', 'expense');

    const response = await transactionsPOST(
      jsonRequest(`${API_URL}/api/transactions`, 'POST', {
        amount: -5,
        description: 'Negativo',
        type: 'expense',
        category,
      })
    );

    expect(response.status).toBe(400);
  });

  it('crea un depósito a una meta y rechaza metas inexistentes', async () => {
    const missing = await transactionsPOST(
      jsonRequest(`${API_URL}/api/transactions`, 'POST', {
        amount: 10000,
        description: 'Ahorro',
        type: 'saving',
        goal: '507f1f77bcf86cd799439011',
      })
    );
    expect(missing.status).toBe(404);

    const goalId = await createActiveGoal();
    const response = await transactionsPOST(
      jsonRequest(`${API_URL}/api/transactions`, 'POST', {
        amount: 10000,
        description: 'Ahorro',
        type: 'saving',
        goal: goalId,
      })
    );
    expect(response.status).toBe(201);
  });

  it('filtra por tipo y valida los queries', async () => {
    await transactionsPOST(
      jsonRequest(`${API_URL}/api/transactions`, 'POST', {
        amount: 100,
        description: 'Sueldo extra',
        type: 'income',
        category: await categoryId('Sueldo', 'income'),
      })
    );

    const list = await transactionsGET(
      jsonRequest(`${API_URL}/api/transactions?type=expense`)
    );
    expect(list.status).toBe(200);
    const expenses = (await list.json()) as { type: string }[];
    expect(expenses.length).toBeGreaterThan(0);
    expect(expenses.every((item) => item.type === 'expense')).toBe(true);

    const badMonth = await transactionsGET(
      jsonRequest(`${API_URL}/api/transactions?month=enero`)
    );
    expect(badMonth.status).toBe(400);

    const emptyMonth = await transactionsGET(
      jsonRequest(`${API_URL}/api/transactions?month=2000-01`)
    );
    expect(emptyMonth.status).toBe(200);
    expect((await emptyMonth.json()) as unknown[]).toHaveLength(0);
  });

  it('actualiza y elimina una transacción', async () => {
    const category = await categoryId('Alimentación', 'expense');
    const created = await transactionsPOST(
      jsonRequest(`${API_URL}/api/transactions`, 'POST', {
        amount: 2500,
        description: 'Mercado',
        type: 'expense',
        category,
      })
    );
    const id = String((await bodyOf(created))._id);

    const badId = await transactionPATCH(
      jsonRequest(`${API_URL}/api/transactions/abc`, 'PATCH', { amount: 3000 }),
      routeContext('abc')
    );
    expect(badId.status).toBe(400);

    const missing = await transactionPATCH(
      jsonRequest(`${API_URL}/api/transactions/507f1f77bcf86cd799439011`, 'PATCH', {
        amount: 3000,
      }),
      routeContext('507f1f77bcf86cd799439011')
    );
    expect(missing.status).toBe(404);

    const updated = await transactionPATCH(
      jsonRequest(`${API_URL}/api/transactions/${id}`, 'PATCH', {
        amount: 3000,
        description: 'Mercado 2',
      }),
      routeContext(id)
    );
    expect(updated.status).toBe(200);
    const updatedBody = await bodyOf(updated);
    expect(updatedBody.amount).toBe(3000);
    expect(updatedBody.description).toBe('Mercado 2');

    const deleted = await transactionDELETE(
      jsonRequest(`${API_URL}/api/transactions/${id}`, 'DELETE'),
      routeContext(id)
    );
    expect(deleted.status).toBe(200);

    const again = await transactionDELETE(
      jsonRequest(`${API_URL}/api/transactions/${id}`, 'DELETE'),
      routeContext(id)
    );
    expect(again.status).toBe(404);
  });
});

describe('API de metas (CRUD)', () => {
  beforeEach(async () => {
    await cleanDatabase();
    cookieJar.clear();
    await createUserWithSession();
  });

  const validGoal = {
    name: 'Viaje a Japón',
    goalType: 'travel',
    targetAmount: 3000000,
    currency: 'ARS',
    deadline: '2027-12-31',
    priority: 'high',
    plannedMonthlyAmount: 50000,
  } as const;

  it('crea una meta y la incluye en el listado con progreso', async () => {
    const response = await goalsPOST(
      jsonRequest(`${API_URL}/api/goals`, 'POST', validGoal)
    );
    expect(response.status).toBe(201);
    const created = await bodyOf(response);
    expect(created).toEqual(expect.objectContaining({ name: 'Viaje a Japón' }));

    const list = await goalsGET();
    expect(list.status).toBe(200);
    const goals = (await list.json()) as { name: string; progressPercentage: number }[];
    expect(goals.some((goal) => goal.name === 'Viaje a Japón')).toBe(true);
    expect(goals[0]).toHaveProperty('progressPercentage');
  });

  it('rechaza una meta con datos inválidos', async () => {
    const response = await goalsPOST(
      jsonRequest(`${API_URL}/api/goals`, 'POST', {
        ...validGoal,
        targetAmount: -100,
      })
    );
    expect(response.status).toBe(400);
  });

  it('elimina una meta existente', async () => {
    const created = await goalsPOST(
      jsonRequest(`${API_URL}/api/goals`, 'POST', validGoal)
    );
    const id = String((await bodyOf(created))._id);

    const deleted = await goalDELETE(
      jsonRequest(`${API_URL}/api/goals/${id}`, 'DELETE'),
      routeContext(id)
    );
    expect(deleted.status).toBe(200);

    const missing = await goalDELETE(
      jsonRequest(`${API_URL}/api/goals/${id}`, 'DELETE'),
      routeContext(id)
    );
    expect(missing.status).toBe(404);

    const badId = await goalDELETE(
      jsonRequest(`${API_URL}/api/goals/abc`, 'DELETE'),
      routeContext('abc')
    );
    expect(badId.status).toBe(400);
  });
});

describe('API de presupuestos (CRUD)', () => {
  const isoDate = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };

  beforeEach(async () => {
    await cleanDatabase();
    cookieJar.clear();
    await createUserWithSession();
    await seedPOST();
  });

  async function categoryIdOf(name: string): Promise<string> {
    const category = await Category.findOne({ name });
    if (!category) {
      throw new Error(`Categoría no encontrada: ${name}`);
    }
    return category._id.toString();
  }

  async function createBudget(
    amount: number,
    category: string,
    startDate = '2026-01-01',
    endDate = '2026-01-31',
    period = 'monthly'
  ): Promise<Response> {
    return budgetsPOST(
      jsonRequest(`${API_URL}/api/budgets`, 'POST', {
        category,
        amount,
        period,
        startDate,
        endDate,
      })
    );
  }

  it('devuelve 401 sin sesión', async () => {
    cookieJar.clear();
    expect((await budgetsGET()).status).toBe(401);
  });

  it('crea un presupuesto y lo devuelve con progreso inicial', async () => {
    const category = await categoryIdOf('Alimentación');

    const response = await createBudget(1000, category);
    expect(response.status).toBe(201);

    const body = await bodyOf(response);
    expect(body).toEqual(
      expect.objectContaining({
        amount: 1000,
        period: 'monthly',
        usedAmount: 0,
        usagePercent: 0,
        status: 'sano',
        category: expect.objectContaining({ name: 'Alimentación' }),
      })
    );
  });

  it('lista presupuestos con categoría poblada y progreso en una sola consulta', async () => {
    const alimentacion = await categoryIdOf('Alimentación');
    const transporte = await categoryIdOf('Transporte');
    await createBudget(1000, alimentacion);

    await Transaction.create([
      {
        amount: 400,
        description: 'Supermercado',
        category: alimentacion,
        type: 'expense',
        date: new Date('2026-01-10T12:00:00'),
      },
      {
        amount: 900,
        description: 'Fuera del rango',
        category: alimentacion,
        type: 'expense',
        date: new Date('2026-02-03T12:00:00'),
      },
      {
        amount: 300,
        description: 'Otra categoría',
        category: transporte,
        type: 'expense',
        date: new Date('2026-01-05T12:00:00'),
      },
    ]);

    const aggregateSpy = vi.spyOn(Budget, 'aggregate');
    const list = await budgetsGET();
    expect(list.status).toBe(200);
    expect(aggregateSpy).toHaveBeenCalledTimes(1);
    aggregateSpy.mockRestore();

    const budgets = (await list.json()) as {
      usedAmount: number;
      usagePercent: number;
      status: string;
      category: { name: string };
    }[];
    expect(budgets).toHaveLength(1);
    expect(budgets[0]).toEqual(
      expect.objectContaining({
        usedAmount: 400,
        usagePercent: 40,
        status: 'sano',
      })
    );
    expect(budgets[0].category.name).toBe('Alimentación');
  });

  it('rechaza montos no positivos', async () => {
    const category = await categoryIdOf('Alimentación');

    const negative = await createBudget(-5, category);
    expect(negative.status).toBe(400);

    const zero = await createBudget(0, category);
    expect(zero.status).toBe(400);
  });

  it('rechaza categorías de ingreso y categorías inexistentes', async () => {
    const income = await categoryIdOf('Sueldo');

    const incomeResponse = await createBudget(1000, income);
    expect(incomeResponse.status).toBe(400);

    const missing = await createBudget(1000, '507f1f77bcf86cd799439011');
    expect(missing.status).toBe(404);
    expect(await bodyOf(missing)).toHaveProperty('error');
  });

  it('rechaza fechas incoherentes o mal formateadas', async () => {
    const category = await categoryIdOf('Alimentación');

    const reversed = await createBudget(1000, category, '2026-01-31', '2026-01-01');
    expect(reversed.status).toBe(400);

    const badFormat = await createBudget(1000, category, '2026/01/01', '2026-01-31');
    expect(badFormat.status).toBe(400);
  });

  it('edita un presupuesto y recalcula el progreso de 40% a 80%', async () => {
    const category = await categoryIdOf('Alimentación');
    const created = await createBudget(1000, category);
    const id = String((await bodyOf(created))._id);

    await Transaction.create({
      amount: 400,
      description: 'Mercado',
      category,
      type: 'expense',
      date: new Date('2026-01-10T12:00:00'),
    });

    const missing = await budgetPATCH(
      jsonRequest(`${API_URL}/api/budgets/507f1f77bcf86cd799439011`, 'PATCH', {
        amount: 500,
      }),
      routeContext('507f1f77bcf86cd799439011')
    );
    expect(missing.status).toBe(404);

    const badId = await budgetPATCH(
      jsonRequest(`${API_URL}/api/budgets/abc`, 'PATCH', { amount: 500 }),
      routeContext('abc')
    );
    expect(badId.status).toBe(400);

    const updated = await budgetPATCH(
      jsonRequest(`${API_URL}/api/budgets/${id}`, 'PATCH', { amount: 500 }),
      routeContext(id)
    );
    expect(updated.status).toBe(200);
    const updatedBody = await bodyOf(updated);
    expect(updatedBody.amount).toBe(500);
    expect(updatedBody.usedAmount).toBe(400);
    expect(updatedBody.usagePercent).toBe(80);
    expect(updatedBody.status).toBe('advertencia');

    const badDates = await budgetPATCH(
      jsonRequest(`${API_URL}/api/budgets/${id}`, 'PATCH', {
        startDate: '2026-02-01',
      }),
      routeContext(id)
    );
    expect(badDates.status).toBe(400);
  });

  it('elimina un presupuesto y responde { message }', async () => {
    const category = await categoryIdOf('Alimentación');
    const created = await createBudget(1000, category);
    const id = String((await bodyOf(created))._id);

    const deleted = await budgetDELETE(
      jsonRequest(`${API_URL}/api/budgets/${id}`, 'DELETE'),
      routeContext(id)
    );
    expect(deleted.status).toBe(200);
    expect((await bodyOf(deleted)).message).toBe('Presupuesto eliminado');

    const again = await budgetDELETE(
      jsonRequest(`${API_URL}/api/budgets/${id}`, 'DELETE'),
      routeContext(id)
    );
    expect(again.status).toBe(404);

    const badId = await budgetDELETE(
      jsonRequest(`${API_URL}/api/budgets/abc`, 'DELETE'),
      routeContext('abc')
    );
    expect(badId.status).toBe(400);
  });

  it('permite dos presupuestos de la misma categoría y período con distintas fechas', async () => {
    const category = await categoryIdOf('Alimentación');

    const january = await createBudget(1000, category, '2026-01-01', '2026-01-31');
    expect(january.status).toBe(201);

    const february = await createBudget(1000, category, '2026-02-01', '2026-02-28');
    expect(february.status).toBe(201);

    const collision = await createBudget(1000, category, '2026-01-01', '2026-01-31');
    expect(collision.status).toBe(409);
  });

  it('excluye presupuestos huérfanos (categoría eliminada)', async () => {
    const category = await categoryIdOf('Alimentación');
    await createBudget(1000, category);
    await Category.findByIdAndDelete(category);

    const list = await budgetsGET();
    expect(list.status).toBe(200);
    expect((await list.json()) as unknown[]).toHaveLength(0);
  });

  it('incluye solo presupuestos vigentes en el resumen del dashboard', async () => {
    const category = await Category.create({
      name: 'Mascotas',
      type: 'expense',
    });
    const categoryId = category._id.toString();
    const now = new Date();
    const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const previousMonthEnd = isoDate(new Date(now.getFullYear(), now.getMonth(), 0));
    const previousMonthStart = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    await Transaction.create({
      amount: 500,
      description: 'Compra del mes',
      category: categoryId,
      type: 'expense',
      date: new Date(now.getFullYear(), now.getMonth(), 10, 12),
    });

    await createBudget(1000, categoryId, monthStart, monthEnd);
    await createBudget(500, categoryId, previousMonthStart, previousMonthEnd);

    const response = await summaryGET();
    expect(response.status).toBe(200);
    const summary = (await response.json()) as { budgets: { amount: number; usedAmount: number }[] };
    expect(summary.budgets).toHaveLength(1);
    expect(summary.budgets[0]).toEqual(
      expect.objectContaining({ amount: 1000, usedAmount: 500 })
    );
  });
});

describe('API de perfil y onboarding', () => {
  beforeEach(async () => {
    await cleanDatabase();
    cookieJar.clear();
  });

  const onboardingBody = {
    name: 'María',
    monthlyIncome: 350000,
    incomeAccuracy: 'approximate',
    fixedExpenses: 120000,
    variableExpenses: 80000,
    emergencyFundMonths: 3,
    baseCurrency: 'ARS',
    savingsCurrency: 'USD',
    goals: [
      {
        name: 'Viaje de fin de año',
        goalType: 'travel',
        targetAmount: 800000,
        currency: 'ARS',
        priority: 'medium',
      },
    ],
  } as const;

  it('devuelve 401 sin sesión', async () => {
    const response = await profileGET();
    expect(response.status).toBe(401);
  });

  it('completa el onboarding y crea el perfil con sus metas', async () => {
    await createUserWithSession('maria@example.com');

    const response = await onboardingPOST(
      jsonRequest(`${API_URL}/api/onboarding`, 'POST', onboardingBody)
    );
    expect(response.status).toBe(201);

    const profile = await FinancialProfile.findOne();
    expect(profile).not.toBeNull();
    expect(profile?.name).toBe('María');
    expect(profile?.onboardingCompleted).toBe(true);
    expect(await SavingsGoal.countDocuments()).toBe(3);
  });

  it('rechaza completar el onboarding dos veces', async () => {
    await createUserWithSession('maria@example.com');
    await onboardingPOST(jsonRequest(`${API_URL}/api/onboarding`, 'POST', onboardingBody));

    const second = await onboardingPOST(
      jsonRequest(`${API_URL}/api/onboarding`, 'POST', onboardingBody)
    );
    expect(second.status).toBe(409);
  });

  it('rechaza un onboarding inválido', async () => {
    await createUserWithSession('maria@example.com');

    const response = await onboardingPOST(
      jsonRequest(`${API_URL}/api/onboarding`, 'POST', {
        ...onboardingBody,
        monthlyIncome: -1,
      })
    );
    expect(response.status).toBe(400);
  });

  it('lee y actualiza el perfil incluyendo el email', async () => {
    await createUserWithSession('maria@example.com');
    await onboardingPOST(jsonRequest(`${API_URL}/api/onboarding`, 'POST', onboardingBody));

    const current = await profileGET();
    expect(current.status).toBe(200);
    const currentBody = await bodyOf(current);
    expect(currentBody.name).toBe('María');
    expect(currentBody.email).toBe('maria@example.com');

    const updated = await profilePATCH(
      jsonRequest(`${API_URL}/api/profile`, 'PATCH', {
        name: 'María López',
        baseCurrency: 'USD',
      })
    );
    expect(updated.status).toBe(200);
    const updatedBody = await bodyOf(updated);
    expect(updatedBody.name).toBe('María López');
    expect(updatedBody.baseCurrency).toBe('USD');
  });

  it('rechaza actualizaciones inválidas del perfil', async () => {
    await createUserWithSession('maria@example.com');
    await onboardingPOST(jsonRequest(`${API_URL}/api/onboarding`, 'POST', onboardingBody));

    const response = await profilePATCH(
      jsonRequest(`${API_URL}/api/profile`, 'PATCH', { baseCurrency: 'JPY' })
    );
    expect(response.status).toBe(400);
  });

  it('cambia la contraseña y rechaza la contraseña actual incorrecta', async () => {
    await createUserWithSession('maria@example.com');

    const wrong = await profilePATCH(
      jsonRequest(`${API_URL}/api/profile`, 'PATCH', {
        currentPassword: 'incorrecta',
        newPassword: 'nueva-segura-123',
      })
    );
    expect(wrong.status).toBe(400);

    const ok = await profilePATCH(
      jsonRequest(`${API_URL}/api/profile`, 'PATCH', {
        currentPassword: 'password123',
        newPassword: 'nueva-segura-123',
      })
    );
    expect(ok.status).toBe(200);

    cookieJar.clear();
    const login = await loginPOST(
      jsonRequest(`${API_URL}/api/auth/login`, 'POST', {
        email: 'maria@example.com',
        password: 'nueva-segura-123',
      })
    );
    expect(login.status).toBe(200);
  });
});

describe('API de reportes (resumen del dashboard)', () => {
  beforeEach(async () => {
    await cleanDatabase();
    cookieJar.clear();
  });

  it('devuelve 401 sin sesión', async () => {
    const response = await summaryGET();
    expect(response.status).toBe(401);
  });

  it('calcula el resumen mensual con los datos de ejemplo', async () => {
    await createUserWithSession();
    await seedPOST();

    const response = await summaryGET();
    expect(response.status).toBe(200);

    const summary = (await response.json()) as Record<string, unknown>;
    expect(summary.monthlyIncome).toBe(233000);
    expect(summary.monthlyExpense).toBe(83700);
    expect(summary.monthlyBalance).toBe(149300);
    expect(summary.totalBalance).toBe(149300);
    expect(summary.plannedSavings).toBe(0);
    expect(summary.financialScore).toBeNull();
    expect(summary.goals).toEqual([]);
    expect(summary.recentTransactions).toHaveLength(5);
  });
});