'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/format';
import type { GoalProgress } from '@/types';

interface GoalDeleteModalProps {
  goal: GoalProgress;
  onClose: () => void;
  onDeleted: () => void;
}

export function GoalDeleteModal({ goal, onClose, onDeleted }: GoalDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isComplete = goal.progressPercentage >= 100;

  async function handleDelete() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/goals/${goal._id}`, { method: 'DELETE' });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === 'object' && result !== null && 'error' in result
            ? String(result.error)
            : 'No se pudo eliminar la meta';
        throw new Error(message);
      }

      onDeleted();
    } catch (deleteError: unknown) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar la meta'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isComplete ? '¡Meta alcanzada!' : 'Eliminar meta'}
      subtitle={goal.name}
    >
      {isComplete ? (
        <div className="border-2 border-ink bg-emerald-500 p-4 text-white shadow-[4px_4px_0_0_#111111]">
          <p className="font-extrabold uppercase tracking-tight">¡Felicitaciones!</p>
          <p className="mt-1 text-sm font-medium">
            Llegaste a tu objetivo de {formatCurrency(goal.targetAmount, goal.currency)}. Podés
            eliminarla o empezar una nueva.
          </p>
        </div>
      ) : (
        <div className="border-2 border-ink bg-amber-400 p-4 text-ink shadow-[4px_4px_0_0_#111111]">
          <p className="text-sm font-medium">
            Esta meta aún no está cumplida. Llevás{' '}
            <strong>{formatCurrency(goal.currentAmount, goal.currency)}</strong> de{' '}
            <strong>{formatCurrency(goal.targetAmount, goal.currency)}</strong>.
          </p>
          <p className="mt-1 text-sm font-medium">
            ¿Estás seguro de que querés eliminarla? Los aportes ya registrados se mantendrán.
          </p>
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-3 border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="btn-brutal btn-brutal-danger"
        >
          {loading ? 'Eliminando...' : isComplete ? 'Eliminar meta' : 'Sí, eliminar'}
        </button>
        <button type="button" onClick={onClose} className="btn-brutal btn-brutal-secondary">
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
