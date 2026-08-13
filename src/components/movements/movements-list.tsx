'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { CategoryIcon } from '@/components/icons/category-icon';
import { formatCurrency, formatDate } from '@/lib/format';
import type {
  CurrencyCode,
  ICategory,
  ITransaction,
  PaidBy,
  TransactionKind,
} from '@/types';

const movementLabels: Record<TransactionKind, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  saving: 'Ahorro o meta',
  withdrawal: 'Retiro',
  settlement: 'Liquidación',
};

const paidByLabels: Record<PaidBy, string> = {
  yo: 'vos',
  pareja: 'tu pareja',
  compartido: 'compartido',
};

type SortOption = 'amount-desc' | 'amount-asc' | 'date' | 'category';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'date', label: 'Por fecha' },
  { value: 'amount-desc', label: 'Mayor a menor' },
  { value: 'amount-asc', label: 'Menor a mayor' },
  { value: 'category', label: 'Por categoría' },
];

function getCategory(category: ITransaction['category']): ICategory | null {
  return typeof category === 'object' ? category : null;
}

function sortTransactions(
  transactions: ITransaction[],
  option: SortOption
): ITransaction[] {
  const sorted = [...transactions];

  switch (option) {
    case 'amount-desc':
      return sorted.sort((a, b) => b.amount - a.amount);
    case 'amount-asc':
      return sorted.sort((a, b) => a.amount - b.amount);
    case 'date':
      return sorted.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    case 'category':
      return sorted.sort((a, b) => {
        const aName = getCategory(a.category)?.name ?? '';
        const bName = getCategory(b.category)?.name ?? '';
        return aName.localeCompare(bName, 'es');
      });
  }
}

interface MovementsListProps {
  currency: CurrencyCode;
  refreshKey: number;
  onEdit: (transaction: ITransaction) => void;
}

export function MovementsList({ currency, refreshKey, onEdit }: MovementsListProps) {
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<ITransaction | null>(null);

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

  function confirmDelete(transaction: ITransaction) {
    setDeletingTransaction(transaction);
  }

  async function executeDelete() {
    if (!deletingTransaction?._id) return;

    const id = deletingTransaction._id;
    setDeletingTransaction(null);
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3">
        <div>
          <h2 className="text-lg font-extrabold uppercase tracking-tight text-ink">Todos los movimientos</h2>
          <p className="mt-0.5 text-sm font-medium text-ink/70">Ingresos, gastos y aportes registrados</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-bold text-ink">
            Ordenar por:
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
              className="form-input py-1.5"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <span className="chip-brutal bg-lime text-ink">{currency}</span>
        </div>
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
          {sortTransactions(transactions, sortOption).map((transaction) => {
            const category = getCategory(transaction.category);
            const goal = typeof transaction.goal === 'object' ? transaction.goal : null;
            const isIncome = transaction.type === 'income';
            const isSaving = transaction.type === 'saving';
            const isWithdrawal = transaction.type === 'withdrawal';
            const isSettlement = transaction.type === 'settlement';
            const isGoalMovement = isSaving || isWithdrawal;

            const amountColor = isIncome
              ? 'text-emerald-600'
              : isSaving
                ? 'text-violet'
                : isWithdrawal
                  ? 'text-amber-600'
                  : isSettlement
                    ? 'text-ink/70'
                    : 'text-ink';

            const amountSign = isIncome
              ? '+'
              : isSaving
                ? '→'
                : isWithdrawal
                  ? '←'
                  : isSettlement
                    ? '⇄'
                    : '−';

            return (
              <li key={transaction._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 sm:flex-nowrap">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink text-ink"
                  style={{
                    backgroundColor: isGoalMovement
                      ? '#ddd6fe'
                      : isSettlement
                        ? '#e7e5e4'
                        : category?.color ?? '#e7e5e4',
                  }}
                >
                  <CategoryIcon
                    name={isGoalMovement ? 'flag' : category?.icon}
                    className="h-5 w-5"
                  />
                </span>
                <div className="min-w-0 flex-1 basis-40 sm:basis-auto">
                  <p className="truncate font-bold text-ink">{transaction.description}</p>
                  <p className="text-xs font-medium text-ink/60">
                    {isGoalMovement
                      ? `Meta: ${goal?.name ?? 'Sin meta'}${isSaving ? (transaction.savingSource === 'external' ? ' · externo' : '') : ''}`
                      : isSettlement
                        ? `Liquidación · recibió ${
                            transaction.paidBy === 'yo' ? 'vos' : 'tu pareja'
                          }`
                        : transaction.paidBy
                          ? `${movementLabels[transaction.type]} · pagó ${paidByLabels[transaction.paidBy]}`
                          : movementLabels[transaction.type]}{' '}
                    · {formatDate(transaction.date)}
                  </p>
                </div>
                <span className={`ml-auto shrink-0 font-extrabold sm:ml-0 ${amountColor}`}>
                  {amountSign} {formatCurrency(transaction.amount, currency)}
                </span>
                <span className="flex w-full gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => onEdit(transaction)}
                    className="btn-brutal btn-brutal-xs btn-brutal-secondary flex-1 sm:flex-none"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => transaction._id && confirmDelete(transaction)}
                    className="btn-brutal btn-brutal-xs btn-brutal-danger flex-1 sm:flex-none"
                  >
                    Borrar
                  </button>
                </span>
              </li>
            );
          }         )}
      </ul>
      )}

      <Modal
        open={deletingTransaction !== null}
        title="Eliminar movimiento"
        subtitle={deletingTransaction ? `${deletingTransaction.description} · ${formatCurrency(deletingTransaction.amount, currency)}` : ''}
        onClose={() => setDeletingTransaction(null)}
      >
        <p className="text-sm font-medium text-ink/80">
          ¿Seguro que querés eliminar este movimiento? Esta acción no se puede deshacer.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => setDeletingTransaction(null)} className="btn-brutal btn-brutal-secondary">
            Cancelar
          </button>
          <button type="button" onClick={executeDelete} className="btn-brutal btn-brutal-danger">
            Sí, eliminar
          </button>
        </div>
      </Modal>
    </section>
  );
}
