'use client';

import { useEffect, useState } from 'react';
import type { DashboardStats } from '@/types';

interface DashboardErrorResponse {
  error?: string;
}

interface UseDashboardResult {
  data: DashboardStats | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

function getErrorMessage(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const errorBody = body as DashboardErrorResponse;

    if (typeof errorBody.error === 'string' && errorBody.error.length > 0) {
      return errorBody.error;
    }
  }

  return 'No se pudieron cargar las estadísticas';
}

export function useDashboard(): UseDashboardResult {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/reports/summary', {
          signal: controller.signal,
        });
        const body: unknown = await response.json();

        if (!response.ok) {
          throw new Error(getErrorMessage(body));
        }

        setData(body as DashboardStats);
      } catch (fetchError: unknown) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'No se pudieron cargar las estadísticas'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => controller.abort();
  }, [retryCount]);

  return {
    data,
    loading,
    error,
    retry: () => setRetryCount((count) => count + 1),
  };
}
