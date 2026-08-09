'use client';

import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { BudgetCard } from '@/components/budgets/budget-card';
import { BudgetFormModal } from '@/components/budgets/budget-form-modal';
import { useBudgets } from '@/hooks/use-budgets';
import type { BudgetProgress, CurrencyCode } from '@/types';

export default function BudgetsPage() {
  const { budgets, loading, error, retry } = useBudgets();
  const [currency, setCurrency] = useState<CurrencyCode>('ARS');
  const [editing, setEditing] = useState<BudgetProgress | null>(null);
  const [deleting, setDeleting] = useState<BudgetProgress | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(): Promise<void> {
      try {
        const response = await fetch('/api/profile');
        const result: unknown = await response.json();

        if (
          response.ok &&
          result &&
          typeof result === 'object' &&
          'baseCurrency' in result &&
          !cancelled
        ) {
          setCurrency((result as { baseCurrency: CurrencyCode }).baseCurrency);
        }
      } catch {
        // La moneda es decorativa; si falla, se usa ARS.
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(): Promise<void> {
    if (!deleting) {
      return;
    }

    try {
      const response = await fetch(`/api/budgets/${deleting._id}`, { method: 'DELETE' });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === 'object' && result !== null && 'error' in result
            ? String(result.error)
            : 'No se pudo eliminar el presupuesto';
        throw new Error(message);
      }

      setDeleting(null);
      retry();
    } catch (deleteError: unknown) {
      console.error(deleteError);
      setDeleting(null);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-lime">
              Límites de gasto
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Presupuestos</h1>
            <p className="mt-2 text-sm font-medium text-ink/70">
              Controlá cuánto gastás por categoría según el período que elijas.
            </p>
          </div>
          <button type="button" onClick={() => setFormOpen(true)} className="btn-brutal">
            Nuevo presupuesto
          </button>
        </div>

        {error ? (
          <section
            role="alert"
            className="mt-8 border-2 border-rose-600 bg-rose-50 p-5 font-semibold text-rose-700 shadow-[4px_4px_0_0_#111111]"
          >
            <p>{error}</p>
            <button type="button" onClick={retry} className="btn-brutal btn-brutal-danger mt-3">
              Reintentar
            </button>
          </section>
        ) : loading ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {[1, 2].map((item) => (
              <div key={item} className="h-48 animate-pulse bg-ink/10" />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <section className="mt-8 border-2 border-ink bg-blue-600 p-6 text-white shadow-[4px_4px_0_0_#111111]">
            <h2 className="font-extrabold uppercase tracking-tight">
              Todavía no creaste presupuestos
            </h2>
            <p className="mt-1 text-sm font-medium">
              Definí un límite mensual, semanal o anual por categoría de gasto y seguí tu
              progreso desde el dashboard.
            </p>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="btn-brutal btn-brutal-secondary mt-4"
            >
              Crear el primero
            </button>
          </section>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {budgets.map((budget) => (
              <BudgetCard
                key={budget._id}
                budget={budget}
                currency={currency}
                onEdit={(selected) => {
                  setEditing(selected);
                  setFormOpen(true);
                }}
                onDelete={setDeleting}
              />
            ))}
          </div>
        )}

        {formOpen ? (
          <BudgetFormModal
            key={editing?._id ?? 'new'}
            budget={editing}
            onClose={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            onSaved={() => {
              setFormOpen(false);
              setEditing(null);
              retry();
            }}
          />
        ) : null}

        {deleting ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Eliminar presupuesto de ${deleting.category.name}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          >
            <div className="card-brutal w-full max-w-md p-5 sm:p-6">
              <h2 className="text-xl font-extrabold uppercase tracking-tight">
                Eliminar presupuesto
              </h2>
              <p className="mt-3 text-sm font-medium text-ink/70">
                ¿Querés eliminar el presupuesto de{' '}
                <strong>{deleting.category.name}</strong>? El gasto ya registrado se mantiene.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="btn-brutal btn-brutal-danger"
                >
                  Sí, eliminar
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(null)}
                  className="btn-brutal btn-brutal-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}