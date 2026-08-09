import { NextResponse } from 'next/server';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import '@/models/Category';
import { FinancialProfile } from '@/models/FinancialProfile';
import { Transaction } from '@/models/Transaction';
import { getGoalsWithProgress } from '@/lib/goal-progress';
import { getBudgetsWithProgress } from '@/lib/budget-progress';
import {
  computeAvailableToSpend,
  computeFinancialScore,
  computePerDayRemaining,
  computeSavingsRate,
  computeScoreMessage,
} from '@/lib/financial-metrics';
import {
  getDaysRemainingInMonth,
  getMonthKey,
  getMonthLabel,
  getMonthRange,
} from '@/lib/monthly-date';
import type { CategoryBehavior, ExpenseByCategory } from '@/types';

interface TypeTotal {
  _id: 'income' | 'expense' | 'saving' | 'withdrawal';
  total: number;
}

interface CategoryRow {
  _id: string;
  name: string;
  color: string;
  behavior: CategoryBehavior;
  total: number;
}

interface FacetResult {
  byType: TypeTotal[];
  byCategory: CategoryRow[];
  balType: TypeTotal[];
}

interface ActiveTotals {
  byType: TypeTotal[];
}

export async function GET() {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    await connectDB({ runMonthlyRollover: true });

    const profile = await FinancialProfile.findOne();
    const activeMonth = profile?.activeMonth ?? getMonthKey();
    const { start, end } = getMonthRange(activeMonth);

    const [facetDocs, activeTotalDocs, recentDocs, goals, budgets] =
      await Promise.all([
      Transaction.aggregate<FacetResult>([
        { $match: { archived: { $ne: true }, date: { $gte: start, $lt: end } } },
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
                  name: '$cat.name',
                  color: '$cat.color',
                  behavior: '$cat.behavior',
                  total: 1,
                },
              },
              { $sort: { total: -1 } },
            ],
          },
        },
      ]),
      Transaction.aggregate<ActiveTotals>([
        { $match: { archived: { $ne: true } } },
        {
          $facet: {
            byType: [
              { $group: { _id: '$type', total: { $sum: '$amount' } } },
            ],
          },
        },
      ]),
      Transaction.find({
        archived: { $ne: true },
        date: { $gte: start, $lt: end },
      })
        .populate('category', 'name color icon')
        .populate('goal', 'name goalType currency')
        .sort({ date: -1 })
        .limit(5),
      getGoalsWithProgress(),
      getBudgetsWithProgress(true),
    ]);

    const facetRow = facetDocs[0] ?? { byType: [], byCategory: [] };
    const activeTotalsRow = activeTotalDocs[0] ?? { byType: [] };
    const recentTransactions = recentDocs;

    const totals = new Map<string, number>(
      facetRow.byType.map((entry) => [entry._id, entry.total])
    );
    const monthlyIncome = totals.get('income') ?? 0;
    const monthlyExpense = totals.get('expense') ?? 0;
    const monthlySavings =
      (totals.get('saving') ?? 0) - (totals.get('withdrawal') ?? 0);

    const allTimeTotals = new Map<string, number>(
      activeTotalsRow.byType.map((entry) => [entry._id, entry.total])
    );
    let totalBalance = 0;
    for (const [type, total] of allTimeTotals) {
      totalBalance +=
        type === 'income' || type === 'withdrawal' ? total : -total;
    }

    const plannedSavings = profile
      ? Math.max(
          0,
          profile.monthlyIncome - profile.fixedExpenses - profile.variableExpenses
        )
      : 0;
    const savingsCapacity = monthlyIncome - monthlyExpense - monthlySavings;
    const savingsPercentage = profile?.monthlyIncome
      ? Number(((plannedSavings / profile.monthlyIncome) * 100).toFixed(2))
      : 0;
    const financialScore = profile
      ? computeFinancialScore({
          monthlyIncome,
          monthlyExpense,
          fixedExpenses: profile.fixedExpenses,
          variableExpenses: profile.variableExpenses,
          plannedSavings,
          monthlySavings,
        })
      : null;

    const expensesByCategory: ExpenseByCategory[] = facetRow.byCategory.map(
      (row) => ({ name: row.name, value: row.total, color: row.color })
    );
    const totalVariable = facetRow.byCategory
      .filter((row) => row.behavior === 'variable')
      .reduce((sum, row) => sum + row.total, 0);
    const totalFixed = profile?.fixedExpenses ?? 0;
    const availableToSpend = computeAvailableToSpend(
      monthlyIncome,
      totalFixed,
      totalVariable
    );
    const daysRemaining = getDaysRemainingInMonth();
    const perDayRemaining = computePerDayRemaining(
      availableToSpend,
      daysRemaining
    );

    const monthlyBalance = monthlyIncome - monthlyExpense - monthlySavings;
    const incomeDistribution: ExpenseByCategory[] = [
      ...expensesByCategory,
      ...(monthlySavings > 0
        ? [{ name: 'Ahorro del mes', value: monthlySavings, color: '#6366f1' }]
        : []),
      ...(monthlyBalance > 0
        ? [{ name: 'Sin asignar', value: monthlyBalance, color: '#94a3b8' }]
        : []),
    ];

    return NextResponse.json({
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      monthlyBalance,
      monthlySavings,
      plannedSavings,
      savingsCapacity,
      savingsPercentage,
      financialScore,
      scoreMessage: computeScoreMessage(financialScore),
      profile,
      goals,
      budgets,
      incomeDistribution,
      recentTransactions,
      activeMonth,
      monthLabel: getMonthLabel(activeMonth),
      daysRemaining,
      totalFixed,
      totalVariable,
      availableToSpend,
      perDayRemaining,
      savingsRate: computeSavingsRate(monthlySavings, monthlyIncome),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}