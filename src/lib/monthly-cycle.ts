import { FinancialProfile } from '@/models/FinancialProfile';
import { MonthlySnapshot } from '@/models/MonthlySnapshot';
import { Transaction } from '@/models/Transaction';
import { getBudgetComplianceForMonth } from '@/lib/budget-progress';
import { getGoalsWithProgress } from '@/lib/goal-progress';
import {
  computeFinancialScore,
  computeScoreMessage,
} from '@/lib/financial-metrics';
import {
  APP_TIMEZONE,
  getDaysInMonth,
  getMonthKey,
  getMonthRange,
  listMonthsBetween,
} from '@/lib/monthly-date';
import type {
  CategoryBehavior,
  CurrencyCode,
  IMonthlySnapshot,
  SnapshotCategoryExpense,
  SnapshotGoal,
} from '@/types';

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

interface TypeTotal {
  _id: 'income' | 'expense' | 'saving' | 'withdrawal';
  total: number;
}

interface CategoryExpense {
  category: string;
  name: string;
  color: string;
  icon?: string;
  behavior: CategoryBehavior;
  total: number;
}

interface TopSpendingDay {
  date: string;
  amount: number;
}

interface FacetResult {
  byType: TypeTotal[];
  byCategory: CategoryExpense[];
  topDay: TopSpendingDay[];
  count: { transactions: number }[];
}

interface GoalContribution {
  _id: string;
  incoming: number;
  outgoing: number;
}

async function buildSnapshot(monthKey: string): Promise<IMonthlySnapshot> {
  const { start, end } = getMonthRange(monthKey);
  const profile = await FinancialProfile.findOne().lean();
  const currency: CurrencyCode = profile?.baseCurrency ?? 'ARS';

  const [facetRows, goalContributions, goalsProgress, budgetCompliance] =
    await Promise.all([
      Transaction.aggregate<FacetResult>([
        // Las liquidaciones de pareja no entran en el snapshot del mes.
        { $match: { date: { $gte: start, $lt: end }, type: { $ne: 'settlement' } } },
        {
          $facet: {
            byType: [
              { $group: { _id: '$type', total: { $sum: '$amount' } } },
            ],
            byCategory: [
              { $match: { type: 'expense' } },
              { $group: { _id: '$category', total: { $sum: '$amount' } } },
              {
                $lookup: {
                  from: 'categories',
                  localField: '_id',
                  foreignField: '_id',
                  as: 'cat',
                },
              },
              { $unwind: '$cat' },
              {
                $project: {
                  _id: 0,
                  category: '$_id',
                  name: '$cat.name',
                  color: '$cat.color',
                  icon: '$cat.icon',
                  behavior: '$cat.behavior',
                  total: 1,
                },
              },
            ],
            topDay: [
              { $match: { type: 'expense' } },
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$date',
                      timezone: APP_TIMEZONE,
                    },
                  },
                  amount: { $sum: '$amount' },
                },
              },
              { $sort: { amount: -1 } },
              { $limit: 1 },
              { $project: { _id: 0, date: '$_id', amount: 1 } },
            ],
            count: [{ $count: 'transactions' }],
          },
        },
      ]),
      Transaction.aggregate<GoalContribution>([
        {
          $match: {
            date: { $gte: start, $lt: end },
            type: { $in: ['saving', 'withdrawal'] },
          },
        },
        {
          $group: {
            _id: '$goal',
            incoming: {
              $sum: { $cond: [{ $eq: ['$type', 'saving'] }, '$amount', 0] },
            },
            outgoing: {
              $sum: {
                $cond: [{ $eq: ['$type', 'withdrawal'] }, '$amount', 0],
              },
            },
          },
        },
      ]),
      getGoalsWithProgress(),
      getBudgetComplianceForMonth(monthKey),
    ]);

  const facet = (facetRows[0] ?? {
    byType: [],
    byCategory: [],
    topDay: [],
    count: [],
  }) as FacetResult;
  const totals = new Map<string, number>(
    facet.byType.map((entry) => [entry._id, entry.total])
  );
  const income = totals.get('income') ?? 0;
  const expenses = totals.get('expense') ?? 0;
  const savings = (totals.get('saving') ?? 0) - (totals.get('withdrawal') ?? 0);
  const fixedExpenses = profile?.fixedExpenses ?? 0;
  const variableExpenses = profile?.variableExpenses ?? 0;
  const plannedSavings = Math.max(
    0,
    income - fixedExpenses - variableExpenses
  );
  const financialScore = computeFinancialScore({
    monthlyIncome: income,
    monthlyExpense: expenses,
    fixedExpenses,
    variableExpenses,
    plannedSavings,
    monthlySavings: savings,
  });

  const expensesByCategory: SnapshotCategoryExpense[] = facet.byCategory.map(
    (row) => ({
      category: String(row.category),
      name: row.name,
      color: row.color,
      icon: row.icon,
      behavior: row.behavior ?? 'variable',
      total: row.total,
      percentage: expenses > 0 ? Number(((row.total / expenses) * 100).toFixed(2)) : 0,
    })
  );
  const totalVariable = expensesByCategory
    .filter((row) => row.behavior === 'variable')
    .reduce((sum, row) => sum + row.total, 0);
  const totalFixed = expenses - totalVariable;

  const contributionsByGoal = new Map(
    goalContributions.map((entry) => [
      String(entry._id),
      entry.incoming - entry.outgoing,
    ])
  );
  const goals: SnapshotGoal[] = goalsProgress.map((goal) => ({
    goal: String(goal._id),
    name: goal.name,
    currency: goal.currency,
    amount: contributionsByGoal.get(String(goal._id)) ?? 0,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    progressPercentage: goal.progressPercentage,
  }));

  return {
    monthKey,
    currency,
    range: { start: start.toISOString(), end: end.toISOString() },
    income,
    expenses,
    savings,
    balance: income - expenses - savings,
    totalFixed,
    totalVariable,
    expensesByCategory,
    budgetCompliance,
    goals,
    financialScore,
    scoreMessage: computeScoreMessage(financialScore),
    transactionsCount: facet.count[0]?.transactions ?? 0,
    metrics: {
      topSpendingDay: facet.topDay[0] ?? null,
      averageDailyExpense: Number(
        (expenses / Math.max(1, getDaysInMonth(monthKey))).toFixed(2)
      ),
    },
  };
}

/**
 * Cierra un mes: crea el snapshot (si no existe) y archiva las transacciones.
 * Es idempotente: si el snapshot ya existe (o el índice único lo rechaza),
 * no falla y solo asegura el archivado. NO toca los budgets.
 */
async function closeMonth(monthKey: string): Promise<void> {
  const existing = await MonthlySnapshot.exists({ monthKey });

  if (!existing) {
    const snapshot = await buildSnapshot(monthKey);

    try {
      await MonthlySnapshot.create(snapshot);
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }
  }

  const { start, end } = getMonthRange(monthKey);
  await Transaction.updateMany(
    { date: { $gte: start, $lt: end } },
    { $set: { archived: true } }
  );
}

export interface MonthlyRolloverResult {
  closedMonths: string[];
  currentMonth: string;
}

/**
 * Lazy rollover mensual: compacta el mes anterior en un snapshot, archiva
 * sus transacciones y avanza activeMonth. Corre después de validar sesión,
 * antes de que las rutas activas lean datos.
 *
 * - Si el perfil no existe: no hace nada (no hay datos que cerrar).
 * - Si el perfil no tiene activeMonth: lo inicializa en el mes actual sin
 *   inventar históricos.
 * - Procesa también los meses omitidos entre activeMonth y el actual.
 */
export async function runMonthlyRollover(
  now: Date = new Date()
): Promise<MonthlyRolloverResult> {
  const profile = await FinancialProfile.findOne().select('activeMonth').lean();

  if (!profile) {
    return { closedMonths: [], currentMonth: getMonthKey(now) };
  }

  const currentMonth = getMonthKey(now);
  const activeMonth = profile.activeMonth ?? null;
  const closedMonths: string[] = [];

  if (!activeMonth) {
    await FinancialProfile.updateOne(
      { _id: profile._id },
      { $set: { activeMonth: currentMonth } }
    );
    return { closedMonths, currentMonth };
  }

  const monthsToClose = listMonthsBetween(activeMonth, currentMonth);

  for (const monthKey of monthsToClose) {
    await closeMonth(monthKey);
    closedMonths.push(monthKey);
  }

  if (monthsToClose.length > 0) {
    await FinancialProfile.updateOne(
      { _id: profile._id },
      { $set: { activeMonth: currentMonth } }
    );
  }

  return { closedMonths, currentMonth };
}