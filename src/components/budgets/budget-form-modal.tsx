'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { MoneyInput } from '@/components/ui/money-input';
import type { BudgetPeriod, BudgetProgress, ICategory } from '@/types';

interface BudgetFormModalProps {
  budget: BudgetProgress | null;
  onClose: () => void;
  onSaved: () => void;
}

const periodLabels: Record<BudgetPeriod, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function periodRange(period: BudgetPeriod): { startDate: string; endDate: string } {
  const now = new Date();

  if (period === 'weekly') {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { startDate: toISODate(monday), endDate: toISODate(sunday) };
  }

  if (period === 'yearly') {
    return {
      startDate: `${now.getFullYear()}-01-01`,
      endDate: `${now.getFullYear()}-12-31`,
    };
  }

  return {
    startDate: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function toLocalDate(value: Date | string | undefined): string {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return toISODate(date);
}

export function BudgetFormModal({ budget, onClose, onSaved }: BudgetFormModalProps) {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [category, setCategory] = useState(() => {
    if (budget) {
      return String(budget.category._id);
    }
    return '';
  });
  const [amount, setAmount] = useState(() => budget?.amount ?? 0);
  const [period, setPeriod] = useState<BudgetPeriod>(() => budget?.period ?? 'monthly');
  const [startDate, setStartDate] = useState(() =>
    budget ? toLocalDate(budget.startDate) : periodRange('monthly').startDate
  );
  const [endDate, setEndDate] = useState(() =>
    budget ? toLocalDate(budget.endDate) : periodRange('monthly').endDate
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories(): Promise<void> {
      try {
        const response = await fetch('/api/categories', { signal: controller.signal });
        const result: unknown = await response.json();

        if (!response.ok) {
          throw new Error('No se pudieron cargar las categorías');
        }

        const expenseCategories = (result as ICategory[]).filter(
          (item) => item.type === 'expense'
        );
        setCategories(expenseCategories);

        if (expenseCategories.length > 0 && !budget && category === '') {
          setCategory(String(expenseCategories[0]._id));
        }
      } catch (loadError: unknown) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }
        setCategoriesError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar las categorías'
        );
      }
    }

    void loadCategories();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget]);

  function handlePeriodChange(nextPeriod: BudgetPeriod) {
    setPeriod(nextPeriod);
    const range = periodRange(nextPeriod);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        category,
        amount,
        period,
        startDate,
        endDate,
      };
      const response = await fetch(`/api/budgets${budget ? `/${budget._id}` : ''}`, {
        method: budget ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === 'object' && result !== null && 'error' in result
            ? String(result.error)
            : budget
              ? 'No se pudo actualizar el presupuesto'
              : 'No se pudo crear el presupuesto';
        throw new Error(message);
      }

      onSaved();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : budget
            ? 'No se pudo actualizar el presupuesto'
            : 'No se pudo crear el presupuesto'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={budget ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      subtitle="Límite de gasto por categoría y período"
    >
      {categoriesError ? (
        <p role="alert" className="border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700">
          {categoriesError}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-bold text-ink">
            Categoría de gasto
            <select
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="form-input"
            >
              {categories.length === 0 ? (
                <option value="">No hay categorías de gasto</option>
              ) : null}
              {categories.map((item) => (
                <option key={String(item._id)} value={String(item._id)}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-ink">
              Monto límite
              <MoneyInput
                required
                min={0.01}
                value={amount}
                onChange={setAmount}
                className="form-input"
              />
            </label>
            <label className="block text-sm font-bold text-ink">
              Período
              <select
                value={period}
                onChange={(event) => handlePeriodChange(event.target.value as BudgetPeriod)}
                className="form-input"
              >
                {(Object.keys(periodLabels) as BudgetPeriod[]).map((value) => (
                  <option key={value} value={value}>
                    {periodLabels[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-ink">
              Desde
              <input
                type="date"
                required
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="form-input"
              />
            </label>
            <label className="block text-sm font-bold text-ink">
              Hasta
              <input
                type="date"
                required
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="form-input"
              />
            </label>
          </div>
          {error ? (
            <p role="alert" className="border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={loading || categories.length === 0} className="btn-brutal">
              {loading
                ? 'Guardando...'
                : budget
                  ? 'Guardar cambios'
                  : 'Crear presupuesto'}
            </button>
            <button type="button" onClick={onClose} className="btn-brutal btn-brutal-secondary">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}