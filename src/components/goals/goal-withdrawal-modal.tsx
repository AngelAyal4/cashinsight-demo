'use client';

import { FormEvent, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { MoneyInput } from '@/components/ui/money-input';
import { formatCurrency } from '@/lib/format';
import type { GoalProgress } from '@/types';

interface GoalWithdrawalModalProps {
  goal: GoalProgress;
  onClose: () => void;
  onWithdrawn: () => void;
}

export function GoalWithdrawalModal({
  goal,
  onClose,
  onWithdrawn,
}: GoalWithdrawalModalProps) {
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState(`Retiro de ${goal.name}`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exceedsBalance = amount > goal.currentAmount;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (amount <= 0 || exceedsBalance) {
      setError('El monto debe ser mayor a cero y no superar lo ahorrado');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'withdrawal',
          goal: goal._id,
          amount,
          description,
        }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === 'object' && result !== null && 'error' in result
            ? String(result.error)
            : 'No se pudo registrar el retiro';
        throw new Error(message);
      }

      onWithdrawn();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo registrar el retiro'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Retiro de ahorro"
      subtitle={`${goal.name} · ${formatCurrency(goal.currentAmount, goal.currency)} ahorrados`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border-2 border-ink bg-amber-400 p-4 text-ink shadow-[4px_4px_0_0_#111111]">
          <p className="text-sm font-medium">
            Vas a retirar fondos de esta meta. El monto disponible es de{' '}
            <strong>{formatCurrency(goal.currentAmount, goal.currency)}</strong>.
          </p>
        </div>
        <label className="block text-sm font-bold text-ink">
          Monto a retirar
          <MoneyInput
            required
            min={0.01}
            max={goal.currentAmount}
            value={amount}
            onChange={setAmount}
            className="form-input"
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Motivo del retiro
          <input
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="form-input"
          />
        </label>
        {exceedsBalance && amount > 0 ? (
          <p role="alert" className="border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700">
            El monto supera lo ahorrado en esta meta.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-brutal btn-brutal-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-brutal btn-brutal-amber">
            {loading ? 'Procesando...' : 'Confirmar retiro'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
