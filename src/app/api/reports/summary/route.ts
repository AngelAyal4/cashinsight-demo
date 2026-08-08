import { NextResponse } from 'next/server';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import '@/models/Category';
import { FinancialProfile } from '@/models/FinancialProfile';
import { Transaction } from '@/models/Transaction';
import { getGoalsWithProgress } from '@/lib/goal-progress';

interface TransactionTotal {
  _id: 'income' | 'expense' | 'saving' | 'withdrawal';
  total: number;
}

interface SingleTotal {
  _id: null;
  total: number;
}

interface CategoryExpense {
  name: string;
  value: number;
  color: string;
}

export async function GET() {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    await connectDB();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const [
      incomeResult,
      expenseResult,
      savingResult,
      withdrawalResult,
      totals,
      expensesByCategory,
      recentTransactions,
      profile,
      goals,
    ] = await Promise.all([
      Transaction.aggregate<SingleTotal>([
        {
          $match: {
            type: 'income',
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate<SingleTotal>([
        {
          $match: {
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate<SingleTotal>([
        {
          $match: {
            type: 'saving',
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate<SingleTotal>([
        {
          $match: {
            type: 'withdrawal',
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate<TransactionTotal>([
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate<CategoryExpense>([
        {
          $match: {
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: '$category', value: { $sum: '$amount' } } },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: '$category' },
        {
          $project: {
            _id: 0,
            name: '$category.name',
            value: 1,
            color: '$category.color',
          },
        },
        { $sort: { value: -1 } },
      ]),
      Transaction.find()
        .populate('category', 'name color icon')
        .populate('goal', 'name goalType currency')
        .sort({ date: -1 })
        .limit(5),
      FinancialProfile.findOne(),
      getGoalsWithProgress(),
    ]);

    const monthlyIncome = incomeResult[0]?.total || 0;
    const monthlyExpense = expenseResult[0]?.total || 0;
    const monthlySavings =
      (savingResult[0]?.total || 0) - (withdrawalResult[0]?.total || 0);
    const totalBalance = totals.reduce(
      (balance, total) =>
        balance +
        (total._id === 'income' || total._id === 'withdrawal'
          ? total.total
          : -total.total),
      0
    );
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
    const financialScore = profile && monthlyIncome > 0
      ? Math.round(
          Math.max(
            0,
            100 -
              (Math.max(
                0,
                monthlyExpense - profile.fixedExpenses - profile.variableExpenses
              ) /
                monthlyIncome) *
                100
          ) * 0.7 +
            (plannedSavings > 0
              ? Math.min(100, (monthlySavings / plannedSavings) * 100)
              : 100) *
              0.3
        )
      : null;

    const monthlyBalance = monthlyIncome - monthlyExpense - monthlySavings;
    const incomeDistribution: CategoryExpense[] = [
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
      scoreMessage:
        financialScore !== null && financialScore < 70
          ? 'Revisa tus gastos para poder alcanzar tus metas'
          : null,
      profile,
      goals,
      incomeDistribution,
      recentTransactions,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
