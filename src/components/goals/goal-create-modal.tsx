'use client';

import { FormEvent, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { MoneyInput } from '@/components/ui/money-input';
import type { CurrencyCode, GoalPriority, GoalType } from '@/types';

type CustomGoalType = Exclude<GoalType, 'emergency' | 'home'>;

const goalTypeLabels: Record<CustomGoalType, string> = {
  car: 'Auto',
  retirement: 'Retiro',
  travel: 'Viaje',
  custom: 'Personalizada',
};

interface GoalCreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function GoalCreateModal({ onClose, onCreated }: GoalCreateModalProps) {
  const [name, setName] = useState('Fondo de retiro');
  const [goalType, setGoalType] = useState<CustomGoalType>('retirement');
  const [targetAmount, setTargetAmount] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>('ARS');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          goalType,
          targetAmount,
          currency,
          deadline: deadline || undefined,
          priority,
        }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === 'object' && result !== null && 'error' in result
            ? String(result.error)
            : 'No se pudo crear la meta';
        throw new Error(message);
      }

      onCreated();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear la meta'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar nueva meta"
      subtitle="Definí tu próximo objetivo de ahorro"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-bold text-ink">
          Nombre de la meta
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="form-input"
            placeholder="Ej. Ahorrar para un viaje"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-ink">
            Tipo
            <select
              value={goalType}
              onChange={(event) => setGoalType(event.target.value as CustomGoalType)}
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
              value={targetAmount}
              onChange={setTargetAmount}
              className="form-input"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-ink">
            Moneda
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
              className="form-input"
            >
              <option value="ARS">Peso argentino (ARS)</option>
              <option value="USD">Dólar estadounidense (USD)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-ink">
            Prioridad
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as GoalPriority)}
              className="form-input"
            >
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-bold text-ink">
          Fecha límite (opcional)
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            className="form-input"
          />
        </label>
        {error ? (
          <p role="alert" className="border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={loading} className="btn-brutal">
            {loading ? 'Creando...' : 'Crear meta'}
          </button>
          <button type="button" onClick={onClose} className="btn-brutal btn-brutal-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
