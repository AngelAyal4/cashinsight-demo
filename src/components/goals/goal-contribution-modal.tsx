'use client';

import { FormEvent, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { MoneyInput } from '@/components/ui/money-input';
import { formatCurrency } from '@/lib/format';
import type { GoalProgress, SavingSource } from '@/types';

interface GoalContributionModalProps {
  goals: GoalProgress[];
  onClose: () => void;
  onSaved: () => void;
}

export function GoalContributionModal({
  goals,
  onClose,
  onSaved,
}: GoalContributionModalProps) {
  const [goalId, setGoalId] = useState(goals[0]?._id ?? '');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState(
    goals[0] ? `Aporte a ${goals[0].name}` : ''
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingSource, setSavingSource] = useState<SavingSource>('income');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedGoal = goals.find((goal) => goal._id === goalId);

  function handleGoalChange(id: string) {
    setGoalId(id);
    const goal = goals.find((item) => item._id === id);
    setDescription(goal ? `Aporte a ${goal.name}` : '');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'saving',
          goal: goalId,
          amount,
          description,
          date,
          savingSource,
        }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === 'object' && result !== null && 'error' in result
            ? String(result.error)
            : 'No se pudo registrar el ahorro';
        throw new Error(message);
      }

      onSaved();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo registrar el ahorro'
      );
    } finally {
      setLoading(false);
    }
  }

  if (goals.length === 0) {
    return (
      <Modal open onClose={onClose} title="Registrar aporte" subtitle="Todavía no tenés metas">
        <p className="text-sm font-medium text-ink/70">
          Primero creá una meta para poder registrar aportes.
        </p>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="btn-brutal btn-brutal-secondary">
            Cerrar
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar aporte"
      subtitle="Apartá una parte de tu ingreso para una meta"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-bold text-ink">
          ¿A cuál meta va este ahorro?
          <select
            required
            value={goalId}
            onChange={(event) => handleGoalChange(event.target.value)}
            className="form-input"
          >
            {goals.map((goal) => (
              <option key={goal._id} value={goal._id}>
                {goal.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-bold text-ink">
            ¿De dónde sale este ahorro?
          </legend>
          <div className="mt-1 grid grid-cols-2 border-2 border-ink bg-white">
            {(
              [
                { value: 'income', label: 'Del ingreso del mes' },
                { value: 'external', label: 'Dinero externo' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSavingSource(option.value)}
                aria-pressed={savingSource === option.value}
                className={`border-r-2 border-ink px-2 py-2 text-xs font-bold transition last:border-r-0 ${
                  savingSource === option.value
                    ? 'bg-lime text-ink'
                    : 'bg-white text-ink/60 hover:bg-paper'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs font-medium text-ink/60">
            {savingSource === 'income'
              ? 'Sale de tus ingresos del mes y reduce tu disponible para gastar.'
              : 'No toca los ingresos del mes: es dinero que ya tenías, un regalo u otro ingreso externo.'}
          </p>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-ink">
            Monto
            <MoneyInput
              required
              min={0.01}
              value={amount}
              onChange={setAmount}
              className="form-input"
            />
          </label>
          <label className="block text-sm font-bold text-ink">
            Fecha
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="form-input"
            />
          </label>
        </div>
        <label className="block text-sm font-bold text-ink">
          Descripción
          <input
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="form-input"
          />
        </label>
        <p className="text-xs font-bold text-ink/60">
          {selectedGoal
            ? `Ahorrado hasta ahora: ${formatCurrency(selectedGoal.currentAmount, selectedGoal.currency)}`
            : ''}
        </p>
        {error ? (
          <p role="alert" className="border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-brutal btn-brutal-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-brutal">
            {loading ? 'Guardando...' : 'Registrar ahorro'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
