'use client';

import { useEffect, useState } from 'react';
import type { GoalProgress } from '@/types';

interface UseGoalsResult {
  goals: GoalProgress[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useGoals(): UseGoalsResult {
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGoals(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/goals', { signal: controller.signal });
        const body: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof body === 'object' && body !== null && 'error' in body
              ? String(body.error)
              : 'No se pudieron cargar las metas';
          throw new Error(message);
        }

        setGoals(body as GoalProgress[]);
      } catch (fetchError: unknown) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          return;
        }

        setError(
          fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar las metas'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadGoals();

    return () => controller.abort();
  }, [retryCount]);

  return {
    goals,
    loading,
    error,
    retry: () => setRetryCount((count) => count + 1),
  };
}
