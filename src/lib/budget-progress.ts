import type { PipelineStage } from 'mongoose';
import { Budget } from '@/models/Budget';
import { FinancialProfile } from '@/models/FinancialProfile';
import { getMonthKey, getMonthRange } from '@/lib/monthly-date';
import type {
  BudgetPeriod,
  BudgetProgress,
  BudgetStatus,
  CategoryBehavior,
  SnapshotBudgetCompliance,
} from '@/types';

interface BudgetCategoryProjection {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  behavior?: CategoryBehavior;
}

interface BudgetRow {
  _id: unknown;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date;
  usedAmount: number;
  category: BudgetCategoryProjection;
  createdAt?: Date;
  updatedAt?: Date;
}

function buildStatus(usagePercent: number): BudgetStatus {
  if (usagePercent < 80) {
    return 'sano';
  }
  return usagePercent <= 100 ? 'advertencia' : 'excedido';
}

interface BudgetPipelineOptions {
  /** Rango del ciclo/progreso (por defecto, el mes activo del perfil). */
  scope: { start: Date; end: Date };
  /** Filtra solo presupuestos que solapan con el scope (dashboard). */
  onlyOverlapping?: boolean;
  /** Filtra por comportamiento de la categoría (Control). */
  behavior?: CategoryBehavior;
  /** Incluye movimientos archivados al reconstruir un reporte histórico. */
  includeArchived?: boolean;
}

function buildBudgetPipeline({
  scope,
  onlyOverlapping,
  behavior,
  includeArchived = false,
}: BudgetPipelineOptions): PipelineStage[] {
  const pipeline: PipelineStage[] = [
    { $addFields: { __cycleStart: scope.start, __cycleEnd: scope.end } },
  ];

  if (onlyOverlapping) {
    pipeline.push({
      $match: {
        $expr: {
          $and: [
            { $lt: ['$startDate', '$__cycleEnd'] },
            { $gte: ['$endDate', '$__cycleStart'] },
          ],
        },
      },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'transactions',
        let: {
          category: '$category',
          startDate: '$startDate',
          endDate: '$endDate',
          cycleStart: '$__cycleStart',
          cycleEnd: '$__cycleEnd',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$type', 'expense'] },
                  ...(includeArchived ? [] : [{ $ne: ['$archived', true] }]),
                  { $eq: ['$category', '$$category'] },
                  {
                    $gte: ['$date', { $max: ['$$startDate', '$$cycleStart'] }],
                  },
                  {
                    $lt: ['$date', { $min: ['$$endDate', '$$cycleEnd'] }],
                  },
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
    { $unwind: '$category' }
  );

  if (behavior) {
    pipeline.push({
      $match: { 'category.behavior': behavior },
    });
  }

  pipeline.push(
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
          behavior: '$category.behavior',
        },
      },
    },
    { $sort: { 'category.name': 1 } }
  );

  return pipeline;
}

/**
 * Rango del ciclo activo: activeMonth del perfil, o el mes de calendario
 * actual si el perfil todavía no arrancó el ciclo.
 */
export async function getActiveCycleRange(): Promise<{ start: Date; end: Date }> {
  const profile = await FinancialProfile.findOne()
    .select('activeMonth')
    .lean();
  const monthKey = profile?.activeMonth ?? getMonthKey();
  return getMonthRange(monthKey);
}

function serializeBudgetRow(row: BudgetRow): BudgetProgress {
  const usedAmount = row.usedAmount;
  const usagePercent = Number(((usedAmount / row.amount) * 100).toFixed(2));

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
    status: buildStatus(usagePercent),
  };
}

/**
 * Presupuestos con progreso calculado para el ciclo actual (el mes activo):
 * solo cuentan transacciones NO archivadas dentro de la intersección entre
 * el rango del límite y el rango del mes activo.
 * @param activeOnly - solo límites que intersectan el ciclo (dashboard).
 * @param behavior - filtra por comportamiento de la categoría (Control).
 */
export async function getBudgetsWithProgress(
  activeOnly = false,
  behavior?: CategoryBehavior
): Promise<BudgetProgress[]> {
  const scope = await getActiveCycleRange();
  const rows = await Budget.aggregate<BudgetRow>(
    buildBudgetPipeline({ scope, onlyOverlapping: activeOnly, behavior })
  );

  return rows.map(serializeBudgetRow);
}

/**
 * Cumplimiento de límites de un mes cerrado (para el snapshot): usos dentro
 * del rango del mes, sin importar si las transacciones quedaron archivadas.
 */
export async function getBudgetComplianceForMonth(
  monthKey: string
): Promise<SnapshotBudgetCompliance[]> {
  const { start, end } = getMonthRange(monthKey);
  const rows = await Budget.aggregate<BudgetRow>(
    buildBudgetPipeline({
      scope: { start, end },
      onlyOverlapping: true,
      includeArchived: true,
    })
  );

  return rows.map((row) => {
    const usedAmount = row.usedAmount;
    const usagePercent = Number(((usedAmount / row.amount) * 100).toFixed(2));

    return {
      budget: String(row._id),
      category: row.category._id,
      categoryName: row.category.name,
      color: row.category.color,
      amount: row.amount,
      usedAmount,
      usagePercent,
      status: buildStatus(usagePercent),
    };
  });
}