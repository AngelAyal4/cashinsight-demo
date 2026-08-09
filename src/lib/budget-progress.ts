import type { PipelineStage } from 'mongoose';
import { Budget } from '@/models/Budget';
import type { BudgetPeriod, BudgetProgress, BudgetStatus } from '@/types';

interface BudgetRow {
  _id: unknown;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date;
  usedAmount: number;
  category: {
    _id: string;
    name: string;
    type: 'income' | 'expense';
    color: string;
    icon: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getBudgetsWithProgress(
  activeOnly = false
): Promise<BudgetProgress[]> {
  const pipeline: PipelineStage[] = [];

  if (activeOnly) {
    pipeline.push({ $match: { endDate: { $gte: new Date() } } });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'transactions',
        let: {
          category: '$category',
          startDate: '$startDate',
          endDate: '$endDate',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$type', 'expense'] },
                  { $eq: ['$category', '$$category'] },
                  { $gte: ['$date', '$$startDate'] },
                  { $lte: ['$date', '$$endDate'] },
                ],
              },
            },
          },
        ],
        as: 'spentTransactions',
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category',
      },
    },
    // Descarta presupuestos huérfanos (categoría eliminada)
    { $unwind: '$category' },
    {
      $project: {
        _id: 1,
        amount: 1,
        period: 1,
        startDate: 1,
        endDate: 1,
        createdAt: 1,
        updatedAt: 1,
        usedAmount: { $sum: '$spentTransactions.amount' },
        category: {
          _id: '$category._id',
          name: '$category.name',
          type: '$category.type',
          color: '$category.color',
          icon: '$category.icon',
        },
      },
    },
    { $sort: { 'category.name': 1 } }
  );

  const rows = await Budget.aggregate<BudgetRow>(pipeline);

  return rows.map((row) => {
    const usedAmount = row.usedAmount;
    const usagePercent = Number(((usedAmount / row.amount) * 100).toFixed(2));
    const status: BudgetStatus =
      usagePercent < 80 ? 'sano' : usagePercent <= 100 ? 'advertencia' : 'excedido';

    return {
      _id: String(row._id),
      category: row.category,
      amount: row.amount,
      period: row.period,
      startDate: row.startDate,
      endDate: row.endDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      usedAmount,
      usagePercent,
      status,
    };
  });
}