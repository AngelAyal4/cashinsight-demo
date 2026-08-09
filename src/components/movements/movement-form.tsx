'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MoneyInput } from '@/components/ui/money-input';
import type {
  GoalProgress,
  ICategory,
  ITransaction,
  TransactionKind,
} from '@/types';

const movementLabels: Record<TransactionKind, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  saving: 'Ahorro o meta',
  withdrawal: 'Retiro',
};

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
}

export function MovementForm({
  goals,
  editing,
  onSaved,
  onCancel,
  initialType,
}: MovementFormProps) {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [type, setType] = useState<TransactionKind>(
    editing?.type ?? initialType ?? 'expense'
  );
  const [amount, setAmount] = useState(editing?.amount ?? 0);
  const [description, setDescription] = useState(editing?.description ?? '');
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
        : { category: categoryId }),
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

  return (
    <>
      <div className="grid grid-cols-3 border-2 border-ink bg-white">
        {(['expense', 'income', 'saving'] as const).map((movementType) => (
          <button
            key={movementType}
            type="button"
            onClick={() => {
              setType(movementType);
              setCategoryId('');
              setGoalId('');
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
        {type === 'saving' || type === 'withdrawal' ? (
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
        {error ? (
          <p
            role="alert"
            className="border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700"
          >
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-brutal"
          >
            {loading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar movimiento'}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={onCancel}
              className="btn-brutal btn-brutal-secondary"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </form>
    </>
  );
}
