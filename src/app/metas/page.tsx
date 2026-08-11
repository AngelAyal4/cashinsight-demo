'use client';

import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { AppHeader } from '@/components/layout/app-header';
import { CategoryIcon } from '@/components/icons/category-icon';
import { GoalContributionModal } from '@/components/goals/goal-contribution-modal';
import { GoalCreateModal } from '@/components/goals/goal-create-modal';
import { GoalDeleteModal } from '@/components/goals/goal-delete-modal';
import { GoalWithdrawalModal } from '@/components/goals/goal-withdrawal-modal';
import { useGoals } from '@/hooks/use-goals';
import { formatCurrency, formatDate } from '@/lib/format';
import type { GoalProgress } from '@/types';

const goalTypeIcons: Record<string, string> = {
  emergency: 'bolt',
  home: 'home',
  car: 'car',
  retirement: 'dollar',
  travel: 'flag',
  custom: 'dots',
};

function GoalProgressChart({ goal }: { goal: GoalProgress }) {
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

  return (
    <div
      className="relative h-32 w-32 shrink-0 sm:h-40 sm:w-40"
      aria-label={`${goal.name}: ${goal.progressPercentage}% completado`}
    >
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 160, height: 160 }}>
        <PieChart>
          <Pie
            data={[{ value: goal.currentAmount }, { value: remainingAmount }]}
            dataKey="value"
            innerRadius="68%"
            outerRadius="88%"
            startAngle={90}
            endAngle={-270}
            stroke="#111111"
            strokeWidth={2}
            animationDuration={300}
          >
            <Cell fill={goal.isEmergency ? '#fbbf24' : '#7c3aed'} />
            <Cell fill="#e7e5e4" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xl font-extrabold text-ink">
        {goal.progressPercentage.toFixed(0)}%
      </p>
    </div>
  );
}

function GoalCard({
  goal,
  onWithdraw,
  onDelete,
}: {
  goal: GoalProgress;
  onWithdraw: (goal: GoalProgress) => void;
  onDelete: (goal: GoalProgress) => void;
}) {
  return (
    <div className="card-brutal animate-fade-in p-5">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
        <div className="flex flex-col items-center gap-2">
          <GoalProgressChart goal={goal} />
          {goal.isEmergency ? (
            <p className="hidden text-xs font-bold uppercase tracking-wide text-ink sm:block">
              <span className="chip-brutal bg-amber-400 text-ink">Meta predefinida</span>
            </p>
          ) : null}
        </div>
        <div className="flex w-full min-w-0 flex-1 flex-col items-center sm:items-start">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-ink bg-lime text-ink"
              aria-hidden="true"
            >
              <CategoryIcon name={goalTypeIcons[goal.goalType]} className="h-4 w-4" />
            </span>
            <h2 className="truncate text-lg font-extrabold text-ink">{goal.name}</h2>
          </div>
          <p className="mt-1 text-sm font-medium text-ink/70">
            {formatCurrency(goal.currentAmount, goal.currency)} de{' '}
            {formatCurrency(goal.targetAmount, goal.currency)}
          </p>
          <p className="mt-3 text-sm font-bold text-ink">
            Falta {formatCurrency(goal.remainingAmount, goal.currency)}
          </p>
          {goal.deadline ? (
            <p className="mt-1 text-xs font-medium text-ink/60">Límite: {formatDate(goal.deadline)}</p>
          ) : (
            <p className="mt-1 text-xs font-medium text-ink/60">Sin fecha límite</p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <button
              type="button"
              onClick={() => onWithdraw(goal)}
              disabled={goal.currentAmount <= 0}
              className="btn-brutal btn-brutal-sm btn-brutal-amber"
            >
              Retiro
            </button>
            <button
              type="button"
              onClick={() => onDelete(goal)}
              className="btn-brutal btn-brutal-sm btn-brutal-danger"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
      {goal.isEmergency ? (
        <p className="mt-4 text-center text-xs font-bold uppercase tracking-wide text-ink sm:hidden">
          <span className="chip-brutal bg-amber-400 text-ink">Meta predefinida</span>
        </p>
      ) : null}
    </div>
  );
}

export default function GoalsPage() {
  const { goals, loading, error, retry } = useGoals();
  const [withdrawingGoal, setWithdrawingGoal] = useState<GoalProgress | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<GoalProgress | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-lime">Objetivos de ahorro</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Tus metas</h1>
            <p className="mt-2 text-sm font-medium text-ink/70">
              Cada aporte registrado actualiza estos progresos automáticamente.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setContributionOpen(true)}
              className="btn-brutal"
            >
              Registrar aporte
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="btn-brutal btn-brutal-secondary"
            >
              Registrar nueva meta
            </button>
          </div>
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
              <div key={item} className="h-56 animate-pulse bg-ink/10" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <section className="mt-8 border-2 border-ink bg-blue-600 p-6 text-white shadow-[4px_4px_0_0_#111111]">
            <h2 className="font-extrabold uppercase tracking-tight">Todavía no configuraste metas</h2>
            <p className="mt-1 text-sm font-medium">
              Completá el onboarding para crear tus metas y tu fondo de emergencia automático.
            </p>
            <a href="/onboarding" className="btn-brutal btn-brutal-secondary mt-4">
              Ir al onboarding
            </a>
          </section>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {goals.map((goal) => (
              <GoalCard
                key={goal._id}
                goal={goal}
                onWithdraw={setWithdrawingGoal}
                onDelete={setDeletingGoal}
              />
            ))}
          </div>
        )}

        {createOpen ? (
          <GoalCreateModal
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false);
              retry();
            }}
          />
        ) : null}

        {contributionOpen ? (
          <GoalContributionModal
            goals={goals}
            onClose={() => setContributionOpen(false)}
            onSaved={() => {
              setContributionOpen(false);
              retry();
            }}
          />
        ) : null}

        {deletingGoal ? (
          <GoalDeleteModal
            key={deletingGoal._id}
            goal={deletingGoal}
            onClose={() => setDeletingGoal(null)}
            onDeleted={() => {
              setDeletingGoal(null);
              retry();
            }}
          />
        ) : null}

        {withdrawingGoal ? (
          <GoalWithdrawalModal
            key={withdrawingGoal._id}
            goal={withdrawingGoal}
            onClose={() => setWithdrawingGoal(null)}
            onWithdrawn={() => {
              setWithdrawingGoal(null);
              retry();
            }}
          />
        ) : null}
      </main>
    </div>
  );
}
