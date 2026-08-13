'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { CategoryIcon } from '@/components/icons/category-icon';
import { ExpensesDonutChart } from '@/components/dashboard/expenses-donut-chart';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/stat-cards';
import { CoupleBalanceCard } from '@/components/dashboard/couple-balance-card';
import { BudgetProgressBar } from '@/components/budgets/budget-card';
import { MovementForm } from '@/components/movements/movement-form';
import { MovementsList } from '@/components/movements/movements-list';
import { Modal } from '@/components/ui/modal';
import { useDashboard } from '@/hooks/use-dashboard';
import { useThresholdNotifications } from '@/hooks/use-threshold-notifications';
import { formatCurrency } from '@/lib/format';
import { hasCoupleActivity } from '@/lib/couple-balance';
import { computeFinancialHealth, type FinancialHealth } from '@/lib/financial-metrics';
import type { ITransaction, PaidBy, TransactionKind } from '@/types';

interface SettlementPreset {
  amount: number;
  paidBy: PaidBy;
}

function FinancialHealthCard({ health }: { health: FinancialHealth }) {
  return (
    <section aria-label="Salud financiera" className="card-brutal p-4">
      <p className="text-[0.7rem] font-bold uppercase tracking-wider text-ink/60">
        Salud financiera
      </p>
      <div className="mt-2 flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink ${health.dotClass}`}
          aria-hidden="true"
        >
          <CategoryIcon name="heart" className="h-4 w-4" />
        </span>
        <p className="text-lg font-extrabold leading-tight text-ink">
          {health.label} <span aria-hidden="true">-</span>{' '}
          <span className="font-semibold">{health.description}</span>
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  const { data, loading, error, retry } = useDashboard();
  const [editing, setEditing] = useState<ITransaction | null>(null);
  const [initialType, setInitialType] = useState<TransactionKind | null>(null);
  const [settlementPreset, setSettlementPreset] =
    useState<SettlementPreset | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [movementsRefreshKey, setMovementsRefreshKey] = useState(0);

  useThresholdNotifications({
    budgets: data?.budgets,
    goals: data?.goals,
    stats: data ?? undefined,
  });

  const currency = data?.profile?.baseCurrency ?? 'ARS';

  function openModal(transaction: ITransaction | null, type?: TransactionKind) {
    setEditing(transaction);
    setInitialType(type ?? null);
    setSettlementPreset(null);
    setModalOpen(true);
  }

  function openSettlementModal() {
    const balance = data?.coupleBalance;

    if (!balance) {
      return;
    }

    setEditing(null);
    setInitialType('settlement');
    setSettlementPreset({
      amount: Math.abs(balance.net),
      paidBy: balance.status === 'te-deben' ? 'yo' : 'pareja',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setInitialType(null);
    setSettlementPreset(null);
  }

  function handleSaved() {
    setModalOpen(false);
    setEditing(null);
    setInitialType(null);
    setSettlementPreset(null);
    setMovementsRefreshKey((key) => key + 1);
    retry();
  }

  const hasIncome = (data?.monthlyIncome ?? 0) > 0;
  const financialHealth = data
    ? computeFinancialHealth({
        monthlyIncome: data.monthlyIncome,
        monthlyExpense: data.monthlyExpense,
        monthlySavings: data.monthlySavings,
        plannedSavings: data.profile ? data.plannedSavings : null,
        fixedExpenses: data.profile ? data.profile.fixedExpenses : null,
        variableExpenses: data.profile ? data.profile.variableExpenses : null,
      })
    : null;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-lime">
              Principal
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
              {data ? data.monthLabel : 'Tu dinero, de un vistazo'}
            </h1>
            {data ? (
              <p className="mt-1 text-sm font-medium text-ink/70">
                Balance del mes:{' '}
                <strong
                  className={data.monthlyBalance >= 0 ? 'text-emerald-600' : 'text-rose-700'}
                >
                  {formatCurrency(data.monthlyBalance, currency)}
                </strong>
              </p>
            ) : null}
          </div>
          {data ? (
            <div className="flex flex-wrap justify-end gap-2">
              {!hasIncome ? (
                <button
                  type="button"
                  onClick={() => openModal(null, 'income')}
                  className="btn-brutal btn-brutal-secondary"
                >
                  Cargar mi ingreso
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => openModal(null)}
                className="btn-brutal"
              >
                Nuevo movimiento
              </button>
            </div>
          ) : null}
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
                ) : !hasIncome ? (
                  <section className="border-2 border-ink bg-blue-600 p-5 text-white shadow-[4px_4px_0_0_#111111]">
                    <h2 className="font-extrabold uppercase tracking-tight">
                      Cargá tu ingreso para empezar el mes
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm font-medium">
                      Sin ingresos registrados no mostramos números inventados:
                      cargá tu sueldo o ingreso del mes para calcular tu
                      disponible para gastar y tu ahorro objetivo.
                    </p>
                    <button
                      type="button"
                      onClick={() => openModal(null, 'income')}
                      className="btn-brutal btn-brutal-secondary mt-4"
                    >
                      Cargar mi ingreso
                    </button>
                  </section>
                ) : data.scoreMessage ? (
                  <section
                    role="status"
                    className="border-2 border-ink bg-amber-400 p-5 text-ink shadow-[4px_4px_0_0_#111111]"
                  >
                    <p className="font-extrabold uppercase tracking-tight">{data.scoreMessage}</p>
                    <p className="mt-1 text-sm font-medium">
                      Tu puntaje actual es {data.financialScore}/100. Revisá tus límites del mes
                      y ajustá tus aportes si hace falta.
                    </p>
                  </section>
                ) : null}
              </>
            ) : null}

            <section aria-label="Indicadores del mes" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div key={String(loading)} className="animate-fade-in h-full">
                <ExpensesDonutChart
                  data={data?.incomeDistribution ?? []}
                  loading={loading}
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                {data ? (
                  <>
                    <StatCard label="Ingresos del mes" value={formatCurrency(data.monthlyIncome, currency)} />
                    <StatCard label="Ahorro del mes" value={formatCurrency(data.monthlySavings, currency)} />
                    {hasIncome ? (
                      <>
                        <StatCard
                          label="Disponible para gastar"
                          value={formatCurrency(data.availableToSpend, currency)}
                        />
                        {financialHealth ? <FinancialHealthCard health={financialHealth} /> : null}
                      </>
                    ) : (
                      <>
                        <StatCard label="Gastos del mes" value={formatCurrency(data.monthlyExpense, currency)} />
                         {financialHealth ? <FinancialHealthCard health={financialHealth} /> : null}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                  </>
                )}
              </div>
            </section>

            {data ? (
              <section aria-label="Presupuesto del mes" className="card-brutal p-5">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">Gastos fijos</h2>
                    <p className="mt-2 text-2xl font-extrabold text-ink">
                      {formatCurrency(data.totalFixed, currency)}
                    </p>
                  </div>
                  {hasIncome ? (
                    <>
                      <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">
                          Gastos variables
                        </h2>
                        <p className="mt-2 text-2xl font-extrabold text-ink">
                          {formatCurrency(data.totalVariable, currency)}
                        </p>
                        <p className="mt-1 text-xs font-medium text-ink/70">
                          {data.monthlyExpense > 0
                            ? `${((data.totalVariable / data.monthlyExpense) * 100).toFixed(0)}% de tus gastos`
                            : 'Sin gastos variables desde Principal'}
                        </p>
                      </div>
                      <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">Tasa de ahorro</h2>
                        <p className="mt-2 text-2xl font-extrabold text-violet">
                          {data.savingsRate.toFixed(1)}%
                        </p>
                        <p className="mt-1 text-xs font-medium text-ink/70">
                          {data.daysRemaining} días restantes del mes
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>
              </section>
            ) : null}

            {data?.coupleBalance && hasCoupleActivity(data.coupleBalance) ? (
              <CoupleBalanceCard
                balance={data.coupleBalance}
                currency={currency}
                coupleSplit={data.profile?.coupleSplit}
                onSettle={openSettlementModal}
              />
            ) : null}

            {data && data.budgets.length > 0 ? (
                <section aria-label="Controla tus límites" className="card-brutal p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">
                    Controla tus límites
                  </h2>
                  <Link href="/control" className="link-brutal text-xs">
                    Ver todos
                  </Link>
                </div>
                <ul className="mt-4 space-y-3">
                  {data.budgets.map((budget) => (
                    <li key={budget._id}>
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-ink">
                        <span className="truncate">{budget.category.name} {budget.usagePercent.toFixed(0)}%</span>
                        <span className="shrink-0 text-ink/60">
                          {formatCurrency(budget.usedAmount, currency)} de{' '}
                          {formatCurrency(budget.amount, currency)}
                        </span>
                      </div>
                      <BudgetProgressBar budget={budget} className="mt-1" />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

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
        title={
          editing
            ? 'Editar movimiento'
            : settlementPreset
              ? 'Liquidar balance de pareja'
              : 'Nuevo movimiento'
        }
        subtitle={`Moneda: ${currency}`}
        onClose={closeModal}
      >
        <MovementForm
          key={editing?._id ?? (initialType ?? 'new')}
          goals={data?.goals ?? []}
          editing={editing}
          initialType={initialType ?? undefined}
          initialAmount={settlementPreset?.amount}
          initialPaidBy={settlementPreset?.paidBy}
          initialDescription={settlementPreset ? 'Liquidación de pareja' : undefined}
          coupleSplit={data?.profile?.coupleSplit}
          onSaved={handleSaved}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}
