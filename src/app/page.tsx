'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { ExpensesDonutChart } from '@/components/dashboard/expenses-donut-chart';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/stat-cards';
import { MovementForm } from '@/components/movements/movement-form';
import { MovementsList } from '@/components/movements/movements-list';
import { Modal } from '@/components/ui/modal';
import { useDashboard } from '@/hooks/use-dashboard';
import { formatCurrency } from '@/lib/format';
import type { ITransaction } from '@/types';

export default function Home() {
  const { data, loading, error, retry } = useDashboard();
  const [editing, setEditing] = useState<ITransaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [movementsRefreshKey, setMovementsRefreshKey] = useState(0);

  const currency = data?.profile?.baseCurrency ?? 'ARS';

  function openModal(transaction: ITransaction | null) {
    setEditing(transaction);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSaved() {
    setModalOpen(false);
    setEditing(null);
    setMovementsRefreshKey((key) => key + 1);
    retry();
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-lime">Principal</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
              Tu dinero, de un vistazo
            </h1>
          </div>
        </div>

        {error ? (
          <section
            role="alert"
            className="border-2 border-rose-600 bg-rose-50 p-5 text-rose-700 shadow-[4px_4px_0_0_#111111]"
          >
            <h2 className="font-extrabold uppercase tracking-tight">No pudimos cargar el resumen</h2>
            <p className="mt-1 text-sm font-medium">{error}</p>
            <button type="button" onClick={retry} className="btn-brutal btn-brutal-danger mt-4">
              Reintentar
            </button>
          </section>
        ) : (
          <>
            {data ? (
              <>
                {!data.profile ? (
                  <section className="border-2 border-ink bg-blue-600 p-5 text-white shadow-[4px_4px_0_0_#111111]">
                    <h2 className="font-extrabold uppercase tracking-tight">Configurá tus metas para personalizar tu plan</h2>
                    <p className="mt-1 max-w-2xl text-sm font-medium">
                      Completá tus ingresos, gastos estimados y objetivos. Así podremos calcular
                      tu capacidad de ahorro y puntaje financiero.
                    </p>
                    <Link href="/onboarding" className="btn-brutal btn-brutal-secondary mt-4">
                      Configurar ahora
                    </Link>
                  </section>
                ) : data.scoreMessage ? (
                  <section
                    role="status"
                    className="border-2 border-ink bg-amber-400 p-5 text-ink shadow-[4px_4px_0_0_#111111]"
                  >
                    <p className="font-extrabold uppercase tracking-tight">{data.scoreMessage}</p>
                    <p className="mt-1 text-sm font-medium">
                      Tu puntaje actual es {data.financialScore}/100. Revisá el presupuesto del mes
                      y ajustá tus aportes si hace falta.
                    </p>
                  </section>
                ) : null}
              </>
            ) : null}

            <section aria-label="Resumen financiero" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div key={String(loading)} className="animate-fade-in h-full">
                <ExpensesDonutChart
                  data={data?.incomeDistribution ?? []}
                  loading={loading}
                />
              </div>
              <button
                type="button"
                onClick={() => openModal(null)}
                className="btn-brutal w-full whitespace-nowrap sm:absolute sm:right-6 sm:top-12 sm:w-auto lg:right-8"
              >
                Nuevo movimiento
              </button>
              <div className="flex flex-col gap-4">
                {data ? (
                  <>
                    <StatCard
                      className="flex-1 animate-fade-in"
                      style={{ animationDelay: '0ms' }}
                      label="Balance total"
                      value={formatCurrency(data.totalBalance, currency)}
                    />
                    <StatCard
                      className="flex-1 animate-fade-in"
                      style={{ animationDelay: '75ms' }}
                      label="Ingresos del mes"
                      value={formatCurrency(data.monthlyIncome, currency)}
                    />
                    <StatCard
                      className="flex-1 animate-fade-in"
                      style={{ animationDelay: '150ms' }}
                      label="Gastos del mes"
                      value={formatCurrency(data.monthlyExpense, currency)}
                    />
                    <StatCard
                      className="flex-1 animate-fade-in"
                      style={{ animationDelay: '225ms' }}
                      label="Salud financiera"
                      value={data.financialScore === null ? 'Pendiente' : `${data.financialScore}/100`}
                    />
                  </>
                ) : (
                  <>
                    <StatCardSkeleton className="flex-1" />
                    <StatCardSkeleton className="flex-1" />
                    <StatCardSkeleton className="flex-1" />
                    <StatCardSkeleton className="flex-1" />
                  </>
                )}
              </div>
            </section>

            {data ? (
              <>
                {data.profile &&
                data.goals.length > 0 &&
                data.monthlySavings === 0 &&
                (data.monthlyIncome > 0 || data.monthlyExpense > 0) ? (
                  <p
                    role="status"
                    className="border-2 border-ink bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[4px_4px_0_0_#111111]"
                  >
                    Aún no registraste un ahorro para tus metas. Recordá que el ahorro es prioridad:
                    apartalo apenas entra tu ingreso, antes que los gastos del mes.
                  </p>
                ) : null}
                <MovementsList
                  currency={currency}
                  refreshKey={movementsRefreshKey}
                  onEdit={openModal}
                />
              </>
            ) : null}
          </>
        )}
      </main>

      <Modal
        open={modalOpen}
        title={editing ? 'Editar movimiento' : 'Nuevo movimiento'}
        subtitle={`Moneda: ${currency}`}
        onClose={closeModal}
      >
        <MovementForm
          key={editing?._id ?? 'new'}
          goals={data?.goals ?? []}
          editing={editing}
          onSaved={handleSaved}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}
