'use client';

import { useEffect, useState } from 'react';
import { CategoryIcon } from '@/components/icons/category-icon';
import { formatCurrency, formatDate } from '@/lib/format';
import type { CurrencyCode, ICategory, ITransaction, TransactionKind } from '@/types';

const movementLabels: Record<TransactionKind, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  saving: 'Ahorro o meta',
  withdrawal: 'Retiro',
};

function getCategory(category: ITransaction['category']): ICategory | null {
  return typeof category === 'object' ? category : null;
}

interface MovementsListProps {
  currency: CurrencyCode;
  refreshKey: number;
  onEdit: (transaction: ITransaction) => void;
}

export function MovementsList({ currency, refreshKey, onEdit }: MovementsListProps) {
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        setLoading(true);
        setError(null);

        try {
          const response = await fetch('/api/transactions?limit=100');
          const data: unknown = await response.json();

          if (!response.ok) {
            throw new Error('No se pudieron cargar los movimientos');
          }

          setTransactions(data as ITransaction[]);
        } catch (loadError: unknown) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudieron cargar los movimientos'
          );
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [refreshKey]);

  async function removeTransaction(id: string) {
    if (!window.confirm('¿Querés eliminar este movimiento?')) return;

    setError(null);
    try {
      const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('No se pudo eliminar el movimiento');
      }

      setTransactions((currentTransactions) =>
        currentTransactions.filter((transaction) => transaction._id !== id)
      );
    } catch (removeError: unknown) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'No se pudo eliminar el movimiento'
      );
    }
  }

  return (
    <section className="card-brutal p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b-2 border-ink pb-3">
        <div>
          <h2 className="text-lg font-extrabold uppercase tracking-tight text-ink">Todos los movimientos</h2>
          <p className="mt-0.5 text-sm font-medium text-ink/70">Ingresos, gastos y aportes registrados</p>
        </div>
        <span className="chip-brutal bg-lime text-ink">{currency}</span>
      </div>
      {error ? (
        <p role="alert" className="mt-4 border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="mt-5 h-64 animate-pulse bg-ink/10" />
      ) : transactions.length === 0 ? (
        <p className="mt-8 text-sm font-bold text-ink/50">Todavía no hay movimientos.</p>
      ) : (
        <ul className="mt-2 divide-y-2 divide-ink/10">
          {transactions.map((transaction) => {
            const category = getCategory(transaction.category);
            const goal = typeof transaction.goal === 'object' ? transaction.goal : null;
            const isIncome = transaction.type === 'income';
            const isSaving = transaction.type === 'saving';
            const isWithdrawal = transaction.type === 'withdrawal';
            const isGoalMovement = isSaving || isWithdrawal;

            const amountColor = isIncome
              ? 'text-emerald-600'
              : isSaving
                ? 'text-violet'
                : isWithdrawal
                  ? 'text-amber-600'
                  : 'text-ink';

            const amountSign = isIncome ? '+' : isSaving ? '→' : isWithdrawal ? '←' : '−';

            return (
              <li key={transaction._id} className="flex items-center gap-3 py-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink text-ink"
                  style={{
                    backgroundColor: isGoalMovement ? '#ddd6fe' : category?.color ?? '#e7e5e4',
                  }}
                >
                  <CategoryIcon
                    name={isGoalMovement ? 'flag' : category?.icon}
                    className="h-5 w-5"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{transaction.description}</p>
                  <p className="text-xs font-medium text-ink/60">
                    {isGoalMovement
                      ? `Meta: ${goal?.name ?? 'Sin meta'}`
                      : movementLabels[transaction.type]}{' '}
                    · {formatDate(transaction.date)}
                  </p>
                </div>
                <span className={`shrink-0 font-extrabold ${amountColor}`}>
                  {amountSign} {formatCurrency(transaction.amount, currency)}
                </span>
                <button
                  type="button"
                  onClick={() => onEdit(transaction)}
                  className="btn-brutal btn-brutal-sm btn-brutal-secondary"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => transaction._id && removeTransaction(transaction._id)}
                  className="btn-brutal btn-brutal-sm btn-brutal-danger"
                >
                  Borrar
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
