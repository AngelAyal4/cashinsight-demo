'use client';

import { useState, useSyncExternalStore } from 'react';
import {
  getPermission,
  isEnabled,
  isSupported,
  requestNotificationPermission,
  setEnabled,
} from '@/lib/notifications';

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function NotificationsSection() {
  const supported = useSyncExternalStore(subscribe, isSupported, () => false);
  const permission = useSyncExternalStore(subscribe, getPermission, () => null);
  const enabled = useSyncExternalStore(subscribe, isEnabled, () => false);
  const [requesting, setRequesting] = useState(false);

  async function handleActivate(): Promise<void> {
    setRequesting(true);

    try {
      const current = getPermission();
      const result =
        current === 'granted' ? current : await requestNotificationPermission();

      if (result === 'granted') {
        setEnabled(true);
      }
    } finally {
      setRequesting(false);
      emitChange();
    }
  }

  function handleDeactivate(): void {
    setEnabled(false);
    emitChange();
  }

  return (
    <section
      aria-label="Notificaciones"
      className="card-brutal animate-fade-in p-5"
    >
      <h2 className="text-lg font-extrabold uppercase tracking-tight">
        Notificaciones
      </h2>
      <p className="mt-2 text-sm font-medium text-ink/70">
        Avisos del sistema cuando superás un límite de Control, te pasás del
        presupuesto o alcanzás una meta.
      </p>

      {!supported ? (
        <p className="mt-4 text-sm font-bold text-ink/60">
          Tu navegador no soporta notificaciones del sistema.
        </p>
      ) : permission === 'denied' ? (
        <p className="mt-4 border-2 border-ink bg-amber-400 p-3 text-sm font-bold text-ink">
          Bloqueaste las notificaciones en este navegador. Habilitalas desde el
          candado de la barra de direcciones → Permisos → Notificaciones, y
          volvé a esta pantalla.
        </p>
      ) : permission === 'granted' && enabled ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-bold text-emerald-700">
            Notificaciones activadas.
          </p>
          <p className="text-xs font-medium text-ink/60">
            Al desactivarlas la app deja de enviarlas; el permiso del navegador
            sigue concedido.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleDeactivate}
              className="btn-brutal btn-brutal-secondary"
            >
              Desactivar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-bold text-ink/70">
            {permission === 'granted'
              ? 'El permiso ya está concedido: activalas para volver a recibir avisos.'
              : 'Necesitamos tu permiso para mostrarte avisos del sistema.'}
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleActivate()}
              disabled={requesting}
              className="btn-brutal"
            >
              {requesting ? 'Pidiendo permiso...' : 'Activar notificaciones'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
