'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoneyInput } from '@/components/ui/money-input';
import type { CurrencyCode, GoalPriority, GoalType, IncomeAccuracy } from '@/types';
import { formatCurrency } from '@/lib/format';

interface GoalDraft {
  name: string;
  goalType: Exclude<GoalType, 'emergency' | 'home'>;
  targetAmount: number;
  currency: CurrencyCode;
  deadline: string;
  priority: GoalPriority;
}

const goalTypeLabels: Record<GoalDraft['goalType'], string> = {
  car: 'Auto',
  retirement: 'Retiro',
  travel: 'Viaje',
  custom: 'Personalizada',
};

const initialGoal: GoalDraft = {
  name: '',
  goalType: 'custom',
  targetAmount: 0,
  currency: 'ARS',
  deadline: '',
  priority: 'medium',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [incomeAccuracy, setIncomeAccuracy] = useState<IncomeAccuracy>('approximate');
  const [fixedExpenses, setFixedExpenses] = useState(0);
  const [variableExpenses, setVariableExpenses] = useState(0);
  const [emergencyFundMonths, setEmergencyFundMonths] = useState(3);
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>('ARS');
  const [savingsCurrency, setSavingsCurrency] = useState<CurrencyCode>('ARS');
  const [goals, setGoals] = useState<GoalDraft[]>([{ ...initialGoal }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthlyExpenses = fixedExpenses + variableExpenses;
  const savingsCapacity = Math.max(0, monthlyIncome - monthlyExpenses);
  const savingsPercentage = monthlyIncome
    ? (savingsCapacity / monthlyIncome) * 100
    : 0;

  function updateGoal(index: number, changes: Partial<GoalDraft>) {
    setGoals((currentGoals) =>
      currentGoals.map((goal, goalIndex) =>
        goalIndex === index ? { ...goal, ...changes } : goal
      )
    );
  }

  function removeGoal(index: number) {
    setGoals((currentGoals) => currentGoals.filter((_, goalIndex) => goalIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          monthlyIncome,
          incomeAccuracy,
          fixedExpenses,
          variableExpenses,
          emergencyFundMonths,
          baseCurrency,
          savingsCurrency,
          goals: goals.map((goal) => ({
            ...goal,
            currency: goal.currency || savingsCurrency,
            deadline: goal.deadline || undefined,
          })),
        }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === 'object' && result !== null && 'error' in result
            ? String(result.error)
            : 'No se pudo guardar la configuración';
        throw new Error(message);
      }

      router.push('/');
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo guardar la configuración'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-8 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="link-brutal">
          ← Volver al resumen
        </Link>
<div className="animate-fade-in mt-8 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wider text-lime">Primer paso</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Armemos tu plan financiero</h1>
            <p className="mt-3 text-sm font-medium text-ink/70">
              Con tus ingresos, gastos estimados y objetivos vamos a calcular cuánto podés
              destinar al ahorro sin perder visibilidad sobre tus gastos.
            </p>
          </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <section className="card-brutal animate-fade-in p-5 sm:p-6">
            <h2 className="text-lg font-extrabold uppercase tracking-tight">Tu situación actual</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-bold text-ink">
                ¿Cómo te llamás?
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="form-input"
                  placeholder="Tu nombre"
                />
              </label>
              <label className="block text-sm font-bold text-ink">
                Ingreso mensual
                <MoneyInput
                  required
                  min={0.01}
                  value={monthlyIncome}
                  onChange={setMonthlyIncome}
                  className="form-input"
                  placeholder="Ej. 150000"
                />
              </label>
              <fieldset>
                <legend className="text-sm font-bold text-ink">¿Qué tan preciso es?</legend>
                <div className="mt-2 flex gap-4 text-sm">
                  {(['approximate', 'exact'] as const).map((accuracy) => (
                    <label key={accuracy} className="flex items-center gap-2 font-medium">
                      <input
                        type="radio"
                        name="incomeAccuracy"
                        value={accuracy}
                        checked={incomeAccuracy === accuracy}
                        onChange={() => setIncomeAccuracy(accuracy)}
                      />
                      {accuracy === 'approximate' ? 'Aproximado' : 'Exacto'}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block text-sm font-bold text-ink">
                Moneda de ingresos y gastos
                <select
                  value={baseCurrency}
                  onChange={(event) => setBaseCurrency(event.target.value as CurrencyCode)}
                  className="form-input"
                >
                  <option value="ARS">Peso argentino (ARS)</option>
                  <option value="USD">Dólar estadounidense (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </label>
              <label className="block text-sm font-bold text-ink">
                Gastos fijos mensuales
                <MoneyInput
                  min={0}
                  value={fixedExpenses}
                  onChange={setFixedExpenses}
                  className="form-input"
                  placeholder="Alquiler, servicios, cuotas..."
                />
              </label>
              <label className="block text-sm font-bold text-ink">
                Gastos variables estimados
                <MoneyInput
                  min={0}
                  value={variableExpenses}
                  onChange={setVariableExpenses}
                  className="form-input"
                  placeholder="Comida, transporte, ocio..."
                />
              </label>
            </div>
            <div className="mt-6 border-2 border-ink bg-lime p-4 text-ink shadow-[4px_4px_0_0_#111111]">
              <p className="text-sm font-bold uppercase tracking-wider">Capacidad estimada de ahorro</p>
              <p className="mt-1 text-2xl font-extrabold">{formatCurrency(savingsCapacity)}</p>
              <p className="mt-1 text-sm font-medium">
                Aproximadamente {savingsPercentage.toFixed(1)}% de tu ingreso mensual.
              </p>
            </div>
          </section>

          <section className="card-brutal animate-fade-in p-5 sm:p-6" style={{ animationDelay: '100ms' }}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-lg font-extrabold uppercase tracking-tight">Tus metas</h2>
                <p className="mt-1 text-sm font-medium text-ink/70">
                  El fondo de emergencia se crea automáticamente en tu moneda de uso diario y cubrirá varios meses de gastos.
                </p>
              </div>
              <label className="text-sm font-bold text-ink">
                Meses de emergencia
                <MoneyInput
                  required
                  min={1}
                  max={24}
                  value={emergencyFundMonths}
                  onChange={setEmergencyFundMonths}
                  className="form-input w-28"
                />
              </label>
            </div>
            <label className="mt-5 block text-sm font-bold text-ink">
              Moneda de ahorro
              <select
                value={savingsCurrency}
                onChange={(event) => setSavingsCurrency(event.target.value as CurrencyCode)}
                className="form-input max-w-sm"
              >
                <option value="ARS">Peso argentino (ARS)</option>
                <option value="USD">Dólar estadounidense (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </label>

            <div className="mt-5 space-y-4">
              {goals.map((goal, index) => (
                <div key={`goal-${index}`} className="border-2 border-ink bg-white p-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="block text-sm font-bold text-ink">
                      Nombre de la meta
                      <input
                        required
                        value={goal.name}
                        onChange={(event) => updateGoal(index, { name: event.target.value })}
                        className="form-input"
                        placeholder="Ej. Comprar una casa"
                      />
                    </label>
                    <label className="block text-sm font-bold text-ink">
                      Tipo
                      <select
                        value={goal.goalType}
                        onChange={(event) =>
                          updateGoal(index, {
                            goalType: event.target.value as GoalDraft['goalType'],
                          })
                        }
                        className="form-input"
                      >
                        {Object.entries(goalTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-bold text-ink">
                      Monto objetivo
                      <MoneyInput
                        required
                        min={0.01}
                        value={goal.targetAmount}
                        onChange={(value) => updateGoal(index, { targetAmount: value })}
                        className="form-input"
                      />
                    </label>
                    <label className="block text-sm font-bold text-ink">
                      Moneda
                      <select
                        value={goal.currency}
                        onChange={(event) =>
                          updateGoal(index, { currency: event.target.value as CurrencyCode })
                        }
                        className="form-input"
                      >
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </label>
                    <label className="block text-sm font-bold text-ink">
                      Fecha límite (opcional)
                      <input
                        type="date"
                        value={goal.deadline}
                        onChange={(event) => updateGoal(index, { deadline: event.target.value })}
                        className="form-input"
                      />
                    </label>
                    <label className="block text-sm font-bold text-ink">
                      Prioridad
                      <select
                        value={goal.priority}
                        onChange={(event) =>
                          updateGoal(index, {
                            priority: event.target.value as GoalPriority,
                          })
                        }
                        className="form-input"
                      >
                        <option value="high">Alta</option>
                        <option value="medium">Media</option>
                        <option value="low">Baja</option>
                      </select>
                    </label>
                  </div>
                  {goals.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeGoal(index)}
                      className="mt-3 text-sm font-bold text-rose-600 hover:text-rose-800"
                    >
                      Quitar meta
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setGoals((currentGoals) => [...currentGoals, { ...initialGoal }])}
              className="btn-brutal btn-brutal-secondary mt-4"
            >
              + Agregar otra meta
            </button>
          </section>

          {error ? (
            <p role="alert" className="border-2 border-rose-600 bg-rose-50 p-4 font-semibold text-rose-700">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={loading} className="btn-brutal w-full sm:w-auto">
            {loading ? 'Guardando configuración...' : 'Crear mi plan financiero'}
          </button>
        </form>
      </div>
    </main>
  );
}
