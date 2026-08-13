import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDB } from '@/lib/db';
import { seedDemoData } from '@/lib/seed';
import { User } from '@/models/User';
import { Category } from '@/models/Category';
import { Transaction } from '@/models/Transaction';
import { FinancialProfile } from '@/models/FinancialProfile';
import { SavingsGoal } from '@/models/SavingsGoal';
import { Budget } from '@/models/Budget';
import { MonthlySnapshot } from '@/models/MonthlySnapshot';

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

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('seedDemoData (seed local idempotente)', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('crea los datos de ejemplo en la primera corrida', async () => {
    const result = await seedDemoData();

    expect(result.created).toBe(true);
    expect(result.message).toBe('Datos de ejemplo creados');
    expect(result.categories).toBe(18);
    expect(result.transactions).toBe(10);
    expect(await Category.countDocuments()).toBe(18);
    expect(await Transaction.countDocuments()).toBe(10);
  });

  it('no duplica datos en una segunda corrida', async () => {
    await seedDemoData();

    const second = await seedDemoData();
    expect(second.created).toBe(false);
    expect(second.message).toBe('Ya existe data');
    expect(second.categories).toBe(18);
    expect(second.transactions).toBe(10);
    expect(await Category.countDocuments()).toBe(18);
    expect(await Transaction.countDocuments()).toBe(10);
  });

  it('completa solo las categorías faltantes si ya existían otras', async () => {
    await Category.insertMany([
      { name: 'Deportes', type: 'expense', behavior: 'variable' },
      { name: 'Regalos', type: 'expense', behavior: 'variable' },
    ]);
    await Category.create({ name: 'Ahorro del mes', type: 'income' });

    const result = await seedDemoData();

    expect(result.created).toBe(false);
    expect(result.message).toBe('Ya existe data');
    expect(await Category.countDocuments()).toBe(21);
    expect(result.categories).toBe(21);
  });

  it('mantiene la paridad de colecciones después de corridas repetidas', async () => {
    await seedDemoData();

    const countsBefore = {
      categories: await Category.countDocuments(),
      transactions: await Transaction.countDocuments(),
      users: await User.countDocuments(),
      financialprofiles: await FinancialProfile.countDocuments(),
      savingsgoals: await SavingsGoal.countDocuments(),
      budgets: await Budget.countDocuments(),
      monthlysnapshots: await MonthlySnapshot.countDocuments(),
    };

    await seedDemoData();
    await seedDemoData();

    const countsAfter = {
      categories: await Category.countDocuments(),
      transactions: await Transaction.countDocuments(),
      users: await User.countDocuments(),
      financialprofiles: await FinancialProfile.countDocuments(),
      savingsgoals: await SavingsGoal.countDocuments(),
      budgets: await Budget.countDocuments(),
      monthlysnapshots: await MonthlySnapshot.countDocuments(),
    };

    expect(countsAfter).toEqual(countsBefore);
  });
});

describe('guard de superficie: sin ruta HTTP de seed', () => {
  it('no existe el archivo de la ruta /api/seed en el código', () => {
    const routeFile = path.join(
      process.cwd(),
      'src',
      'app',
      'api',
      'seed',
      'route.ts'
    );

    expect(fs.existsSync(routeFile)).toBe(false);
  });
});