'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProgressBar } from '@tremor/react';
import { CategoryIcon } from '@/components/icons/category-icon';
import { ExpensesDonutChart } from '@/components/dashboard/expenses-donut-chart';
import { monthLabelOf } from '@/components/reports/reports-list';
import { useDeleteReport, useReportDetail } from '@/hooks/use-reports';
import { formatCurrency } from '@/lib/format';
import type { CurrencyCode, ExpenseByCategory, IMonthlySnapshot } from '@/types';

interface SnapshotViewProps {
  report: IMonthlySnapshot;
  currency: CurrencyCode;
}

function SnapshotOverview({ report, currency }: SnapshotViewProps) {
  const expensesData: ExpenseByCategory[] = report.expensesByCategory.map(
    (row) => ({ name: row.name, value: row.total, color: row.color })
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex h-full flex-col gap-4">
        <div className="card-brutal p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">
            Balance del mes
          </h2>
          <p
            className={`mt-2 text-3xl font-extrabold ${
              report.balance >= 0 ? 'text-emerald-600' : 'text-rose-700'
            }`}
          >
            {formatCurrency(report.balance, currency)}
          </p>
          <p className="mt-1 text-xs font-medium text-ink/60">
            {report.transactionsCount} movimientos registrados en el mes
          </p>
        </div>
        <div className="card-brutal p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">
            Fijos vs variables
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <span className="chip-brutal bg-ink text-white">
              Fijos: {formatCurrency(report.totalFixed, currency)}
            </span>
            <span className="chip-brutal bg-lime text-ink">
              Variables: {formatCurrency(report.totalVariable, currency)}
            </span>
            <span className="chip-brutal bg-white text-ink">
              Ahorro: {formatCurrency(report.savings, currency)}
            </span>
          </div>
        </div>
        <div className="card-brutal p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">
            Métricas de contexto
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="font-medium text-ink/70">Día con más gastos</dt>
              <dd className="font-extrabold text-ink">
                {report.metrics.topSpendingDay ? (
                  <>
                    {report.metrics.topSpendingDay.date} ·{' '}
                    {formatCurrency(report.metrics.topSpendingDay.amount, currency)}
                  </>
                ) : (
                  'Sin gastos'
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="font-medium text-ink/70">Gasto promedio diario</dt>
              <dd className="font-extrabold text-ink">
                {formatCurrency(report.metrics.averageDailyExpense, currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="font-medium text-ink/70">Score financiero</dt>
              <dd className="font-extrabold text-ink">
                {report.financialScore === null
                  ? 'Pendiente'
                  : `${report.financialScore}/100`}
              </dd>
            </div>
          </dl>
          {report.scoreMessage ? (
            <p role="status" className="mt-3 text-sm font-bold text-amber-600">
              {report.scoreMessage}
            </p>
          ) : null}
        </div>
      </div>
      <ExpensesDonutChart data={expensesData} />
    </div>
  );
}

const complianceStatusLabel: Record<string, string> = {
  sano: 'Sano',
  advertencia: 'En alerta',
  excedido: 'Excedido',
};

const complianceStatusClass: Record<string, string> = {
  sano: 'bg-emerald-500 text-white',
  advertencia: 'bg-amber-400 text-ink',
  excedido: 'bg-rose-600 text-white',
};

function SnapshotCompliance({ report, currency }: SnapshotViewProps) {
  if (report.budgetCompliance.length === 0) {
    return (
      <p className="mt-4 text-sm font-bold text-ink/50">
        No había límites de Control activos en este mes.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-4">
      {report.budgetCompliance.map((row) => (
        <li key={row.budget} className="flex flex-wrap items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink text-white"
            style={{ backgroundColor: row.color }}
            aria-hidden="true"
          >
            <CategoryIcon name={undefined} className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-ink">
              <span>{row.categoryName}</span>
              <span className="text-ink/60">
                {formatCurrency(row.usedAmount, currency)} de{' '}
                {formatCurrency(row.amount, currency)}
              </span>
            </span>
            <ProgressBar
              className="mt-1"
              value={Math.min(100, row.usagePercent)}
              color={
                row.status === 'sano'
                  ? 'emerald'
                  : row.status === 'advertencia'
                    ? 'amber'
                    : 'rose'
              }
            />
          </span>
          <span
            className={`chip-brutal ${complianceStatusClass[row.status]} `}
          >
            {complianceStatusLabel[row.status]} · {row.usagePercent.toFixed(0)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function SnapshotGoals({ report }: SnapshotViewProps) {
  if (report.goals.length === 0) {
    return (
      <p className="mt-4 text-sm font-bold text-ink/50">
        No había metas de ahorro activas al cierre de este mes.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-4">
      {report.goals.map((goal) => (
        <li key={goal.goal} className="card-brutal p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-extrabold text-ink">{goal.name}</h3>
            <span className="text-sm font-extrabold text-ink">
              {formatCurrency(goal.currentAmount, goal.currency)} de{' '}
              {formatCurrency(goal.targetAmount, goal.currency)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-ink/60">
            <span>
              Aporte del mes: {formatCurrency(goal.amount, goal.currency)}
            </span>
            <span>{goal.progressPercentage.toFixed(0)}%</span>
          </div>
          <ProgressBar
            className="mt-2"
            value={goal.progressPercentage}
            color="indigo"
          />
        </li>
      ))}
    </ul>
  );
}

interface ReportsDetailProps {
  monthKey: string;
}

export function ReportsDetail({ monthKey }: ReportsDetailProps) {
  const router = useRouter();
  const { report, loading, error } = useReportDetail(monthKey);
  const { deleteReport, loading: deleting, error: deleteError } = useDeleteReport();

  if (loading) {
    return <div className="mt-8 h-80 animate-pulse bg-ink/10" />;
  }

  if (error || !report) {
    return (
      <section
        role="alert"
        className="mt-8 border-2 border-rose-600 bg-rose-50 p-5 font-semibold text-rose-700 shadow-[4px_4px_0_0_#111111]"
      >
        <p>{error ?? 'El reporte no está disponible'}</p>
        <Link
          href="/report"
          className="btn-brutal btn-brutal-secondary mt-4"
        >
          Volver al historial
        </Link>
      </section>
    );
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `¿Estás seguro de que querés eliminar el reporte de ${monthLabelOf(report.monthKey)}? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    const success = await deleteReport(report.monthKey);
    if (success) {
      router.push('/report');
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-extrabold uppercase tracking-tight text-ink">
            {monthLabelOf(report.monthKey)}
          </h2>
          <p className="mt-1 text-sm font-medium text-ink/70">
            Snapshot del cierre mensual · {report.transactionsCount} movimientos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="btn-brutal btn-brutal-sm btn-brutal-danger"
          >
            {deleting ? 'Eliminando...' : '🗑 Eliminar reporte'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/report')}
            className="btn-brutal btn-brutal-sm btn-brutal-secondary"
          >
            ← Volver al historial
          </button>
        </div>
      </div>

      {deleteError ? (
        <section
          role="alert"
          className="border-2 border-rose-600 bg-rose-50 p-4 font-semibold text-rose-700 shadow-[4px_4px_0_0_#111111]"
        >
          <p>{deleteError}</p>
        </section>
      ) : null}

      <section aria-label="Rendimiento del mes" className="card-brutal p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-ink/60">
          Rendimiento
        </h3>
        <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="card-brutal bg-white p-4">
            <dt className="text-[0.7rem] font-bold uppercase tracking-wider text-ink/60">
              Ingresos
            </dt>
            <dd className="mt-2 text-xl font-extrabold text-ink">
              {formatCurrency(report.income, report.currency)}
            </dd>
          </div>
          <div className="card-brutal bg-white p-4">
            <dt className="text-[0.7rem] font-bold uppercase tracking-wider text-ink/60">
              Gastos
            </dt>
            <dd className="mt-2 text-xl font-extrabold text-ink">
              {formatCurrency(report.expenses, report.currency)}
            </dd>
          </div>
          <div className="card-brutal bg-white p-4">
            <dt className="text-[0.7rem] font-bold uppercase tracking-wider text-ink/60">
              Ahorro
            </dt>
            <dd className="mt-2 text-xl font-extrabold text-violet">
              {formatCurrency(report.savings, report.currency)}
            </dd>
          </div>
          <div className="card-brutal bg-white p-4">
            <dt className="text-[0.7rem] font-bold uppercase tracking-wider text-ink/60">
              Salud financiera
            </dt>
            <dd className="mt-2 text-xl font-extrabold text-ink">
              {report.financialScore === null
                ? 'Pendiente'
                : `${report.financialScore}/100`}
            </dd>
          </div>
        </dl>
      </section>

      <SnapshotOverview report={report} currency={report.currency} />

      <section aria-label="Cumplimiento de límites" className="card-brutal p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-ink/60">
          Cumplimiento de límites
        </h3>
        <SnapshotCompliance report={report} currency={report.currency} />
      </section>

      <section aria-label="Metas de ahorro" className="card-brutal p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-ink/60">
          Metas de ahorro al cierre
        </h3>
        <SnapshotGoals report={report} currency={report.currency} />
      </section>
    </div>
  );
}
