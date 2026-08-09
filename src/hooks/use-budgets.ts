'use client';

import { useEffect, useState } from 'react';
import type { BudgetProgress } from '@/types';

interface UseBudgetsResult {
  budgets: BudgetProgress[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/** Filtro opcional por comportamiento de la categoría (Control usa 'variable'). */
export function useBudgets(behavior?: 'fijo' | 'variable'): UseBudgetsResult {
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBudgets(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const query = behavior ? `?behavior=${behavior}` : '';
        const response = await fetch(`/api/budgets${query}`, {
          signal: controller.signal,
        });
        const body: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof body === 'object' && body !== null && 'error' in body
              ? String(body.error)
              : 'No se pudieron cargar los presupuestos';
          throw new Error(message);
        }

        setBudgets(body as BudgetProgress[]);
      } catch (fetchError: unknown) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'No se pudieron cargar los presupuestos'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadBudgets();

    return () => controller.abort();
  }, [retryCount, behavior]);

  return {
    budgets,
    loading,
    error,
    retry: () => setRetryCount((count) => count + 1),
  };
}