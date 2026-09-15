'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { formatCurrency } from '@/lib/format';
import { useDeleteReport } from '@/hooks/use-reports';
import type { ReportListItem } from '@/types';

const monthLabelFormatter = new Intl.DateTimeFormat('es-AR', {
  month: 'long',
  year: 'numeric',
});

export function monthLabelOf(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const label = monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 15)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface ReportsListProps {
  reports: ReportListItem[];
  onDelete?: (monthKey: string) => void;
}

export function ReportsList({ reports, onDelete }: ReportsListProps) {
  const router = useRouter();
  const { deleteReport, loading: deleting } = useDeleteReport();

  const byYear = useMemo(() => {
    const groups = new Map<string, ReportListItem[]>();

    for (const report of reports) {
      const year = report.monthKey.slice(0, 4);
      const current = groups.get(year) ?? [];
      current.push(report);
      groups.set(year, current);
    }

    return [...groups.entries()];
  }, [reports]);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, report: ReportListItem) => {
      e.stopPropagation();
      if (deleting) return;

      const confirmed = window.confirm(
        `¿Eliminar el reporte de ${monthLabelOf(report.monthKey)}?`
      );
      if (!confirmed) return;

      const success = await deleteReport(report.monthKey);
      if (success && onDelete) {
        onDelete(report.monthKey);
      }
    },
    [deleteReport, deleting, onDelete]
  );

  return (
    <div className="mt-8 space-y-8">
      {byYear.map(([year, monthReports]) => (
        <section key={year} aria-label={`Reportes de ${year}`}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">
            {year}
          </h2>
          <div className="mt-3 grid gap-6 lg:grid-cols-2">
            {monthReports.map((report) => (
              <div
                key={report.monthKey}
                className="card-brutal animate-fade-in p-5 text-left transition hover:bg-lime"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/report?mes=${report.monthKey}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-extrabold text-ink">
                      {monthLabelOf(report.monthKey)}
                    </h2>
                    <span
                      className={`chip-brutal ${
                        report.balance >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {report.balance >= 0 ? 'Superávit' : 'Déficit'}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="font-bold uppercase tracking-wide text-ink/60">Balance</dt>
                      <dd className="font-extrabold text-ink">
                        {formatCurrency(report.balance, report.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wide text-ink/60">Ahorro</dt>
                      <dd className="font-extrabold text-ink">
                        {formatCurrency(report.savings, report.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wide text-ink/60">Ingresos</dt>
                      <dd className="font-bold text-ink">
                        {formatCurrency(report.income, report.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wide text-ink/60">Gastos</dt>
                      <dd className="font-bold text-ink">
                        {formatCurrency(report.expenses, report.currency)}
                      </dd>
                    </div>
                  </dl>
                  {report.financialScore !== null ? (
                    <p className="mt-3 text-xs font-bold text-ink/60">
                      Score financiero: {report.financialScore}/100
                    </p>
                  ) : null}
                </button>
                {onDelete ? (
                  <div className="mt-3 border-t-2 border-ink/10 pt-3">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, report)}
                      disabled={deleting}
                      className="text-xs font-bold text-rose-600 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      {deleting ? 'Eliminando...' : 'Eliminar reporte'}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
