'use client';

import { useCallback, useEffect, useState } from 'react';
import type { IMonthlySnapshot, ReportListItem } from '@/types';

interface UseReportsResult {
  reports: ReportListItem[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useReports(): UseReportsResult {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReports(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/reports', {
          signal: controller.signal,
        });
        const body: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof body === 'object' && body !== null && 'error' in body
              ? String(body.error)
              : 'No se pudieron cargar los reportes';
          throw new Error(message);
        }

        setReports(body as ReportListItem[]);
      } catch (loadError: unknown) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar los reportes'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadReports();

    return () => controller.abort();
  }, [retryCount]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  return { reports, loading, error, retry };
}

interface UseReportDetailResult {
  report: IMonthlySnapshot | null;
  loading: boolean;
  error: string | null;
}

export function useReportDetail(monthKey: string | null): UseReportDetailResult {
  const [report, setReport] = useState<IMonthlySnapshot | null>(null);
  const [loading, setLoading] = useState(monthKey !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!monthKey) {
      return;
    }

    const controller = new AbortController();

    async function loadDetail(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/reports/${monthKey}`, {
          signal: controller.signal,
        });
        const body: unknown = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof body === 'object' && body !== null && 'error' in body
              ? String(body.error)
              : 'No se pudo cargar el reporte'
          );
        }

        setReport(body as IMonthlySnapshot);
      } catch (loadError: unknown) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar el reporte'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => controller.abort();
  }, [monthKey]);

  return { report, loading, error };
}

interface UseDeleteReportResult {
  loading: boolean;
  error: string | null;
  deleteReport: (monthKey: string) => Promise<boolean>;
}

export function useDeleteReport(): UseDeleteReportResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteReport = useCallback(
    async (monthKey: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/reports/${monthKey}`, {
          method: 'DELETE',
        });
        const body: unknown = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof body === 'object' && body !== null && 'error' in body
              ? String(body.error)
              : 'Error al eliminar el reporte'
          );
        }

        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Error al eliminar el reporte'
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, deleteReport };
}

interface UseResetReportsResult {
  loading: boolean;
  error: string | null;
  resetReports: () => Promise<boolean>;
}

export function useResetReports(onReset: () => void): UseResetReportsResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetReports = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reports/reset', {
        method: 'DELETE',
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof body === 'object' && body !== null && 'error' in body
            ? String(body.error)
            : 'Error al resetear los reportes'
        );
      }

      onReset();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al resetear los reportes'
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, [onReset]);

  return { loading, error, resetReports };
}
