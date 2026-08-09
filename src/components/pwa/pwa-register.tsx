'use client';

import { useEffect } from 'react';

/**
 * Registra el Service Worker estático (`/sw.js`) del lado del cliente.
 * Es inofensivo en SSR y en entornos sin Service Worker (jsdom): sale por los guards.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    function register(): void {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // El registro es progresivo: si falla, la app sigue funcionando igual.
      });
    }

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
