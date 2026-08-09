import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDB } from '@/lib/db';
import { runMonthlyRollover } from '@/lib/monthly-cycle';
import {
  getMonthKey,
  getMonthRange,
  listMonthsBetween,
} from '@/lib/monthly-date';
import { FinancialProfile } from '@/models/FinancialProfile';
import { MonthlySnapshot } from '@/models/MonthlySnapshot';
import { Transaction } from '@/models/Transaction';
import { Category } from '@/models/Category';
import { Budget } from '@/models/Budget';
import { SavingsGoal } from '@/models/SavingsGoal';

const NOVEMBER_2026 = new Date('2026-11-15T12:00:00Z');

async function cleanDatabase(): Promise<void> {
  await Promise.all([
    FinancialProfile.deleteMany({}),
    MonthlySnapshot.deleteMany({}),
    Transaction.deleteMany({}),
    Category.deleteMany({}),
    Budget.deleteMany({}),
    SavingsGoal.deleteMany({}),
  ]);
}

async function seedProfile(activeMonth?: string): Promise<void> {
  await FinancialProfile.create({
    name: 'Test',
    monthlyIncome: 300000,
    incomeAccuracy: 'exact',
    fixedExpenses: 80000,
    variableExpenses: 100000,
    emergencyFundMonths: 3,
    baseCurrency: 'ARS',
    savingsCurrency: 'ARS',
    onboardingCompleted: true,
    ...(activeMonth ? { activeMonth } : {}),
  });
}

async function seedMonthData(monthKey: string): Promise<{
  categoryVariable: string;
  categoryFixed: string;
  goal: string;
}> {
  const variable = await Category.create({
    name: 'Alimentación',
    type: 'expense',
    color: '#f97316',
    icon: 'utensils',
    behavior: 'variable',
  });
  const fixed = await Category.create({
    name: 'Vivienda',
    type: 'expense',
    color: '#8b5cf6',
    icon: 'home',
    behavior: 'fijo',
  });
  const goal = await SavingsGoal.create({
    name: 'Viaje',
    goalType: 'travel',
    targetAmount: 500000,
    currency: 'ARS',
    active: true,
  });

  const { start, end } = getMonthRange(monthKey);
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86400000);
  const day = (offsetDay: number): Date =>
    new Date(start.getTime() + Math.min(offsetDay, daysInMonth - 1) * 86400000);

  await Transaction.create({
    amount: 1000,
    description: 'Ingreso del mes',
    type: 'income',
    category: variable._id.toString(),
    date: day(2),
  });
  await Transaction.create({
    amount: 300,
    description: 'Compra',
    type: 'expense',
    category: variable._id.toString(),
    date: day(5),
  });
  await Transaction.create({
    amount: 200,
    description: 'Alquiler',
    type: 'expense',
    category: fixed._id.toString(),
    date: day(6),
  });
  await Transaction.create({
    amount: 150,
    description: 'Ahorro mensual',
    type: 'saving',
    goal: goal._id.toString(),
    date: day(10),
  });

  await Budget.create({
    category: variable._id.toString(),
    amount: 1000,
    period: 'monthly',
    startDate: start,
    endDate: end,
  });

  return {
    categoryVariable: variable._id.toString(),
    categoryFixed: fixed._id.toString(),
    goal: goal._id.toString(),
  };
}

async function createTransactionInMonth(monthKey: string, category: string): Promise<void> {
  const { start } = getMonthRange(monthKey);
  await Transaction.create({
    amount: 50,
    description: 'Ingreso extra',
    type: 'income',
    category,
    date: new Date(start.getTime() + 2 * 86400000),
  });
}

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Rollover mensual (monthly-cycle)', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('listMonthsBetween incluye el mes activo y excluye el actual', () => {
    expect(listMonthsBetween('2026-05', '2026-08')).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
    ]);
    expect(listMonthsBetween('2026-07', '2026-07')).toEqual([]);
  });

  it('no hace nada si no existe perfil', async () => {
    const result = await runMonthlyRollover(NOVEMBER_2026);
    expect(result).toEqual({ closedMonths: [], currentMonth: getMonthKey(NOVEMBER_2026) });
    expect(await MonthlySnapshot.countDocuments()).toBe(0);
    expect(await FinancialProfile.countDocuments()).toBe(0);
  });

  it('inicializa activeMonth sin cerrar meses ni inventar snapshots', async () => {
    await seedProfile();
    await seedMonthData('2026-07');

    const result = await runMonthlyRollover(NOVEMBER_2026);

    expect(result.currentMonth).toBe(getMonthKey(NOVEMBER_2026));
    expect(result.closedMonths).toEqual([]);
    const profile = await FinancialProfile.findOne();
    expect(profile?.activeMonth).toBe(getMonthKey(NOVEMBER_2026));
    expect(await MonthlySnapshot.countDocuments()).toBe(0);
    expect(await Transaction.countDocuments({ archived: true })).toBe(0);
  });

  it('cierra el mes anterior: snapshot, archivado y avance de activeMonth', async () => {
    await seedProfile('2026-06');
    const { categoryVariable } = await seedMonthData('2026-06');
    await createTransactionInMonth('2026-07', categoryVariable);

    const result = await runMonthlyRollover(new Date('2026-07-15T12:00:00Z'));

    expect(result.closedMonths).toEqual(['2026-06']);
    expect(result.currentMonth).toBe('2026-07');

    const profile = await FinancialProfile.findOne();
    expect(profile?.activeMonth).toBe('2026-07');

    const snapshot = await MonthlySnapshot.findOne({ monthKey: '2026-06' });
    expect(snapshot).not.toBeNull();
    expect(snapshot?.income).toBe(1000);
    expect(snapshot?.expenses).toBe(500);
    expect(snapshot?.savings).toBe(150);
    expect(snapshot?.balance).toBe(350);
    expect(snapshot?.transactionsCount).toBe(4);
    expect(snapshot?.totalVariable).toBe(300);
    expect(snapshot?.totalFixed).toBe(200);
    expect(snapshot?.budgetCompliance).toHaveLength(1);
    expect(snapshot?.budgetCompliance[0]).toEqual(
      expect.objectContaining({ categoryName: 'Alimentación', amount: 1000, usedAmount: 300 })
    );
    expect(snapshot?.goals).toHaveLength(1);
    expect(snapshot?.goals[0]).toEqual(
      expect.objectContaining({ name: 'Viaje', amount: 150 })
    );
    expect(snapshot?.metrics.averageDailyExpense).toBeGreaterThan(0);

    const archivedInJune = await Transaction.countDocuments({
      date: { $gte: getMonthRange('2026-06').start, $lt: getMonthRange('2026-06').end },
      archived: true,
    });
    expect(archivedInJune).toBe(4);
    const keptInJuly = await Transaction.countDocuments({ archived: { $ne: true } });
    expect(keptInJuly).toBe(1);
    expect(await Budget.countDocuments()).toBe(1);
  });

  it('es idempotente y tolera ejecuciones concurrentes', async () => {
    await seedProfile('2026-06');
    await seedMonthData('2026-06');

    const results = await Promise.allSettled([
      runMonthlyRollover(new Date('2026-07-15T12:00:00Z')),
      runMonthlyRollover(new Date('2026-07-15T12:00:00Z')),
    ]);

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(await MonthlySnapshot.countDocuments({ monthKey: '2026-06' })).toBe(1);
    expect(await Transaction.countDocuments({ archived: true })).toBe(4);

    const again = await runMonthlyRollover(new Date('2026-07-15T12:00:00Z'));
    expect(again.closedMonths).toEqual([]);
    expect(await MonthlySnapshot.countDocuments()).toBe(1);
  });

  it('mantiene el cumplimiento si el mes ya tenía transacciones archivadas', async () => {
    await seedProfile('2026-06');
    await seedMonthData('2026-06');
    const range = getMonthRange('2026-06');

    await Transaction.updateMany(
      { date: { $gte: range.start, $lt: range.end } },
      { $set: { archived: true } }
    );

    await runMonthlyRollover(new Date('2026-07-15T12:00:00Z'));

    const snapshot = await MonthlySnapshot.findOne({ monthKey: '2026-06' });
    expect(snapshot?.budgetCompliance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ categoryName: 'Alimentación', usedAmount: 300 }),
      ])
    );
  });

  it('procesa los meses omitidos entre activeMonth y el actual', async () => {
    await seedProfile('2026-06');
    await seedMonthData('2026-06');

    const result = await runMonthlyRollover(NOVEMBER_2026);

    expect(result.closedMonths).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(await MonthlySnapshot.countDocuments()).toBe(5);
    const profile = await FinancialProfile.findOne();
    expect(profile?.activeMonth).toBe(getMonthKey(NOVEMBER_2026));
  });

  it('no cierra nada cuando activeMonth ya es el mes actual', async () => {
    await seedProfile('2026-07');
    const { categoryVariable } = await seedMonthData('2026-07');
    await createTransactionInMonth('2026-06', categoryVariable);

    const result = await runMonthlyRollover(new Date('2026-07-15T12:00:00Z'));

    expect(result.closedMonths).toEqual([]);
    expect(await MonthlySnapshot.countDocuments()).toBe(0);
    expect(await Transaction.countDocuments({ archived: true })).toBe(0);
    const profile = await FinancialProfile.findOne();
    expect(profile?.activeMonth).toBe('2026-07');
  });

  it('respeta el día actual si el mes no cambió a mediados de mes', async () => {
    await seedProfile('2026-07');
    await seedMonthData('2026-07');

    const result = await runMonthlyRollover(new Date('2026-07-20T12:00:00Z'));

    expect(result.closedMonths).toEqual([]);
    expect(result.currentMonth).toBe('2026-07');
    const profile = await FinancialProfile.findOne();
    expect(profile?.activeMonth).toBe('2026-07');
    expect(await MonthlySnapshot.countDocuments()).toBe(0);
  });
});