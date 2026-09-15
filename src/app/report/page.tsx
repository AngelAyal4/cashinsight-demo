'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { ReportsEmptyState } from '@/components/reports/reports-empty-state';
import { ReportsList } from '@/components/reports/reports-list';
import { useDeleteReport, useReports, useResetReports } from '@/hooks/use-reports';
import { isValidMonthKey } from '@/lib/monthly-date';

const ReportsDetail = dynamic(
  () => import('@/components/reports/reports-detail').then((mod) => mod.ReportsDetail),
  {
    ssr: false,
    loading: () => <div className="mt-8 h-80 animate-pulse bg-ink/10" />,
  }
);

function ReportsContent() {
  const searchParams = useSearchParams();
  const selectedMonth = useMemo(() => {
    const value = searchParams.get('mes');

    if (!value || !isValidMonthKey(value)) {
      return null;
    }

    return value;
  }, [searchParams]);

  const { reports, loading, error, retry } = useReports();
  const { resetReports, loading: resetting, error: resetError } = useResetReports(retry);
  const { deleteReport, loading: deleting } = useDeleteReport();

  const handleDeleteFromList = useCallback(
    async (monthKey: string) => {
      const success = await deleteReport(monthKey);
      if (success) {
        // Si el mes eliminado era el seleccionado, volver al listado
        if (selectedMonth === monthKey) {
          window.location.href = '/report';
        } else {
          retry();
        }
      }
    },
    [deleteReport, selectedMonth, retry]
  );

  const handleResetAll = async () => {
    const confirmed = window.confirm(
      '¿Estás seguro de que querés eliminar TODOS los reportes? Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;
    await resetReports();
  };

  const showResetButton = !loading && reports.length > 0 && !selectedMonth;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-lime">Reportes</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
              Tu historial mensual
            </h1>
            <p className="mt-2 text-sm font-medium text-ink/70">
              Cada cierre de mes compacta tus movimientos en un reporte.
            </p>
          </div>
          {showResetButton ? (
            <button
              type="button"
              onClick={handleResetAll}
              disabled={resetting}
              className="btn-brutal btn-brutal-danger"
            >
              {resetting ? 'Eliminando...' : '🗑 Resetear todos'}
            </button>
          ) : null}
        </div>

        {error ? (
          <section
            role="alert"
            className="mt-8 border-2 border-rose-600 bg-rose-50 p-5 font-semibold text-rose-700 shadow-[4px_4px_0_0_#111111]"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={retry}
              className="btn-brutal btn-brutal-danger mt-3"
            >
              Reintentar
            </button>
          </section>
        ) : resetError ? (
          <section
            role="alert"
            className="mt-8 border-2 border-rose-600 bg-rose-50 p-5 font-semibold text-rose-700 shadow-[4px_4px_0_0_#111111]"
          >
            <p>{resetError}</p>
          </section>
        ) : selectedMonth ? (
          <ReportsDetail monthKey={selectedMonth} />
        ) : loading ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {[1, 2].map((item) => (
              <div key={item} className="h-48 animate-pulse bg-ink/10" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <ReportsEmptyState />
        ) : (
          <ReportsList reports={reports} onDelete={handleDeleteFromList} />
        )}
      </main>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsContent />
    </Suspense>
  );
}
