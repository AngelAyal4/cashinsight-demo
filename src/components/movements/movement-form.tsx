'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MoneyInput } from '@/components/ui/money-input';
import { formatCoupleSplit } from '@/lib/couple-split';
import type {
  CoupleSplit,
  GoalProgress,
  ICategory,
  ITransaction,
  PaidBy,
  SavingSource,
  TransactionKind,
} from '@/types';

const movementLabels: Record<TransactionKind, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  saving: 'Ahorro o meta',
  withdrawal: 'Retiro',
  settlement: 'Liquidación',
};

const paidByOptions: { value: PaidBy; label: string }[] = [
  { value: 'yo', label: 'Angel' },
  { value: 'pareja', label: 'Macarena' },
  { value: 'compartido', label: 'Compartido' },
];

const settlementOptions: { value: 'yo' | 'pareja'; label: string }[] = [
  { value: 'yo', label: 'Angel' },
  { value: 'pareja', label: 'Macarena' },
];

function getCategoryId(category: ITransaction['category']): string {
  return typeof category === 'object' ? category._id ?? '' : category ?? '';
}

function getGoalId(goal: ITransaction['goal']): string {
  return typeof goal === 'object' ? goal._id ?? '' : goal ?? '';
}

interface MovementFormProps {
  goals: GoalProgress[];
  editing: ITransaction | null;
  onSaved: () => void;
  onCancel: () => void;
  initialType?: TransactionKind;
  /** Liquidación pre-cargada desde el balance de pareja. */
  initialAmount?: number;
  initialPaidBy?: PaidBy;
  initialDescription?: string;
  /** Configuración de reparto para gastos "Compartido" (default 50/50). */
  coupleSplit?: CoupleSplit;
}

export function MovementForm({
  goals,
  editing,
  onSaved,
  onCancel,
  initialType,
  initialAmount,
  initialPaidBy,
  initialDescription,
  coupleSplit,
}: MovementFormProps) {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [type, setType] = useState<TransactionKind>(
    editing?.type ?? initialType ?? 'expense'
  );
  const [amount, setAmount] = useState(editing?.amount ?? initialAmount ?? 0);
  const [description, setDescription] = useState(
    editing?.description ?? initialDescription ?? ''
  );
  const [paidBy, setPaidBy] = useState<PaidBy | null>(
    editing?.paidBy ?? initialPaidBy ?? null
  );
  const [savingSource, setSavingSource] = useState<SavingSource>(
    editing?.savingSource ?? 'income'
  );
  const [categoryId, setCategoryId] = useState(
    editing ? getCategoryId(editing.category) : ''
  );
  const [goalId, setGoalId] = useState(editing ? getGoalId(editing.goal) : '');
  const [date, setDate] = useState(
    editing
      ? new Date(editing.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type]
  );

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        try {
          const response = await fetch('/api/categories');
          const data: unknown = await response.json();

          if (!response.ok) {
            throw new Error('No se pudieron cargar las categorías');
          }

          setCategories(data as ICategory[]);
        } catch {
          setError('No se pudieron cargar las categorías');
        }
      })();
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      type,
      amount,
      description,
      date,
      ...(type === 'saving' || type === 'withdrawal'
        ? { goal: goalId }
        : type === 'settlement'
          ? {}
          : { category: categoryId }),
      ...(type === 'saving' ? { savingSource } : {}),
      ...(type === 'expense' || type === 'settlement' ? { paidBy } : {}),
    };

    try {
      const response = await fetch(
        editing ? `/api/transactions/${editing._id}` : '/api/transactions',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === 'object' && result !== null && 'error' in result
            ? String(result.error)
            : 'No se pudo guardar el movimiento';
        throw new Error(message);
      }

      onSaved();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo guardar el movimiento'
      );
    } finally {
      setLoading(false);
    }
  }

  const isSettlement = type === 'settlement';

  return (
    <>
      {isSettlement ? (
        <p className="border-2 border-ink bg-lime px-3 py-2 text-sm font-bold text-ink">
          Liquidación de pareja: no cuenta como ingreso ni gasto, solo salda el
          balance.
        </p>
      ) : (
      <div className="grid grid-cols-3 border-2 border-ink bg-white">
        {(['expense', 'income', 'saving'] as const).map((movementType) => (
          <button
            key={movementType}
            type="button"
            onClick={() => {
              setType(movementType);
              setCategoryId('');
              setGoalId('');
              setPaidBy(null);
            }}
            className={`border-r-2 border-ink px-2 py-2.5 text-xs font-bold transition last:border-r-0 sm:text-sm ${
              type === movementType
                ? 'bg-lime text-ink'
                : 'bg-white text-ink/60 hover:bg-paper'
            }`}
          >
            {movementLabels[movementType]}
          </button>
        ))}
      </div>
      )}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block text-sm font-bold text-ink">
          Descripción
          <input
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="form-input"
            placeholder="Ej. Supermercado"
          />
        </label>
        {isSettlement ? null : type === 'saving' || type === 'withdrawal' ? (
          <>
            <label className="block text-sm font-bold text-ink">
              {type === 'withdrawal' ? '¿De cuál meta retirás?' : '¿A cuál meta va este ahorro?'}
              <select
                required
                value={goalId}
                onChange={(event) => setGoalId(event.target.value)}
                className="form-input"
              >
                <option value="">Elegí una meta</option>
                {goals.map((goal) => (
                  <option key={goal._id} value={goal._id}>
                    {goal.name}
                  </option>
                ))}
              </select>
            </label>
            {type === 'saving' ? (
              <fieldset>
                <legend className="text-sm font-bold text-ink">
                  ¿De dónde sale este ahorro?
                </legend>
                <div className="mt-1 grid grid-cols-2 border-2 border-ink bg-white">
                  {(
                    [
                      { value: 'income', label: 'Del ingreso del mes' },
                      { value: 'external', label: 'Dinero externo' },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSavingSource(option.value)}
                      aria-pressed={savingSource === option.value}
                      className={`border-r-2 border-ink px-2 py-2 text-xs font-bold transition last:border-r-0 ${
                        savingSource === option.value
                          ? 'bg-lime text-ink'
                          : 'bg-white text-ink/60 hover:bg-paper'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs font-medium text-ink/60">
                  {savingSource === 'income'
                    ? 'Sale de tus ingresos del mes y reduce tu disponible para gastar.'
                    : 'No toca los ingresos del mes: es dinero que ya tenías, un regalo u otro ingreso externo.'}
                </p>
              </fieldset>
            ) : null}
          </>
        ) : (
          <label className="block text-sm font-bold text-ink">
            Categoría
            <select
              required
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="form-input"
            >
              <option value="">Elegí una categoría</option>
              {availableCategories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-ink">
            Monto
            <MoneyInput
              required
              min={0.01}
              value={amount}
              onChange={setAmount}
              className="form-input"
            />
          </label>
          <label className="block text-sm font-bold text-ink">
            Fecha
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="form-input"
            />
          </label>
        </div>
        {type === 'expense' ? (
          <fieldset>
            <legend className="text-sm font-bold text-ink">¿Quién pagó?</legend>
            <div className="mt-1 grid grid-cols-2 border-2 border-ink bg-white sm:grid-cols-4">
              <button
                type="button"
                onClick={() => setPaidBy(null)}
                aria-pressed={paidBy === null}
                  className={`border-r-2 border-b-2 border-ink px-2 py-2 text-xs font-bold transition sm:border-b-0 ${
                  paidBy === null
                    ? 'bg-lime text-ink'
                    : 'bg-white text-ink/60 hover:bg-paper'
                }`}
              >
                Sin definir
              </button>
              {paidByOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPaidBy(option.value)}
                  aria-pressed={paidBy === option.value}
                  className={`border-r-2 border-ink px-2 py-2 text-xs font-bold transition last:border-r-0 ${
                    option.value === 'yo' ? 'border-b-2 sm:border-b-0' : ''
                  } ${
                    paidBy === option.value
                      ? 'bg-lime text-ink'
                      : 'bg-white text-ink/60 hover:bg-paper'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs font-medium text-ink/60">
              Los gastos &quot;Compartido&quot; se dividen {formatCoupleSplit(coupleSplit ?? '50/50')} en el balance
              de pareja.
            </p>
          </fieldset>
        ) : null}
        {isSettlement ? (
          <fieldset>
            <legend className="text-sm font-bold text-ink">
              ¿Quién recibió la plata?
            </legend>
            <div className="mt-1 grid grid-cols-2 border-2 border-ink bg-white">
              {settlementOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPaidBy(option.value)}
                  aria-pressed={paidBy === option.value}
                  className={`border-r-2 border-ink px-2 py-2 text-xs font-bold transition last:border-r-0 ${
                    paidBy === option.value
                      ? 'bg-lime text-ink'
                      : 'bg-white text-ink/60 hover:bg-paper'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs font-medium text-ink/60">
              Si el monto no es exacto, el balance queda con el saldo restante.
            </p>
          </fieldset>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700"
          >
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-brutal btn-brutal-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-brutal"
          >
            {loading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar movimiento'}
          </button>
        </div>
      </form>
    </>
  );
}
