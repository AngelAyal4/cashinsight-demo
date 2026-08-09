'use client';

import { useState } from 'react';
import { ProgressBar } from '@tremor/react';
import { CategoryIcon } from '@/components/icons/category-icon';
import { formatCurrency, formatDate } from '@/lib/format';
import type { BudgetProgress, CurrencyCode } from '@/types';

interface BudgetProgressBarProps {
  budget: BudgetProgress;
  className?: string;
}

export function BudgetProgressBar({ budget, className }: BudgetProgressBarProps) {
  const displayValue = Math.min(100, budget.usagePercent);
  const color =
    budget.status === 'sano'
      ? 'emerald'
      : budget.status === 'advertencia'
        ? 'amber'
        : 'rose';

  return (
    <ProgressBar
      value={displayValue}
      label={`${budget.usagePercent.toFixed(0)}%`}
      color={color}
      className={className}
    />
  );
}

interface BudgetCardProps {
  budget: BudgetProgress;
  currency: CurrencyCode;
  onEdit: (budget: BudgetProgress) => void;
  onDelete: (budget: BudgetProgress) => void;
}

const periodLabels: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

export function BudgetCard({ budget, currency, onEdit, onDelete }: BudgetCardProps) {
  const [confirming, setConfirming] = useState(false);
  const overBudget = Math.max(0, budget.usedAmount - budget.amount);

  return (
    <div className="card-brutal animate-fade-in p-5">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink text-white"
          style={{ backgroundColor: budget.category.color }}
          aria-hidden="true"
        >
          <CategoryIcon name={budget.category.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-extrabold text-ink">
              {budget.category.name}
            </h2>
            <span
              className={`chip-brutal ${
                budget.status === 'sano'
                  ? 'bg-emerald-500 text-white'
                  : budget.status === 'advertencia'
                    ? 'bg-amber-400 text-ink'
                    : 'bg-rose-600 text-white'
              }`}
            >
              {budget.status === 'sano'
                ? 'Sano'
                : budget.status === 'advertencia'
                  ? 'En alerta'
                  : 'Excedido'}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-ink/70">
            {periodLabels[budget.period]} · {formatDate(budget.startDate)} al{' '}
            {formatDate(budget.endDate)}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm font-bold text-ink">
        Gastado {formatCurrency(budget.usedAmount, currency)} de{' '}
        {formatCurrency(budget.amount, currency)}
      </p>
      <BudgetProgressBar budget={budget} className="mt-2" />

      {budget.status === 'excedido' ? (
        <p className="mt-2 text-sm font-bold text-rose-700">
          Excedente: {formatCurrency(overBudget, currency)}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit(budget)}
          className="btn-brutal btn-brutal-sm"
        >
          Editar
        </button>
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-ink/70">
              ¿Eliminar?
            </span>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onDelete(budget);
              }}
              className="btn-brutal btn-brutal-sm btn-brutal-danger"
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="btn-brutal btn-brutal-sm btn-brutal-secondary"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="btn-brutal btn-brutal-sm btn-brutal-danger"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}