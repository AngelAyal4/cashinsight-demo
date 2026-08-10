'use client';

import { FormEvent, useState } from 'react';

type RecoveryStep = 'collapsed' | 'request' | 'form' | 'done';

function getErrorMessage(result: unknown, fallback: string): string {
  return typeof result === 'object' && result !== null && 'error' in result
    ? String(result.error)
    : fallback;
}

export function PasswordRecovery() {
  const [step, setStep] = useState<RecoveryStep>('collapsed');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setToken('');
    setNewPassword('');
    setError(null);
    setSubmitting(false);
  }

  async function handleRequestToken() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot', { method: 'POST' });
      const result: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(result, 'No se pudo generar el token'));
        return;
      }

      setStep('form');
    } catch {
      setError('No se pudo conectar con el servidor. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), newPassword }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        setError(
          getErrorMessage(result, 'No se pudo restablecer la contraseña')
        );
        return;
      }

      reset();
      setStep('done');
    } catch {
      setError('No se pudo conectar con el servidor. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'collapsed') {
    return (
      <p className="mt-3 text-center text-sm font-medium text-ink/70">
        <button
          type="button"
          onClick={() => setStep('request')}
          className="link-brutal font-bold"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </p>
    );
  }

  if (step === 'done') {
    return (
      <div className="mt-5 border-2 border-ink bg-lime p-4">
        <p role="status" className="text-sm font-bold text-ink">
          Contraseña actualizada. Iniciá sesión con tu nueva contraseña.
        </p>
        <button
          type="button"
          onClick={() => setStep('collapsed')}
          className="btn-brutal btn-brutal-xs btn-brutal-secondary mt-3"
        >
          Volver al login
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Recuperar contraseña"
      className="mt-5 border-2 border-ink bg-paper p-4"
    >
      <h2 className="text-sm font-extrabold uppercase tracking-tight text-ink">
        Recuperar contraseña
      </h2>

      {step === 'request' ? (
        <>
          <p className="mt-2 text-sm font-medium text-ink/70">
            Tocá &quot;Pedir token&quot; y copiá el token que aparece en la
            consola donde corre el server (la terminal de{' '}
            <code className="font-bold">npm run dev</code>). Es válido 15
            minutos y de un solo uso.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={handleRequestToken}
              className="btn-brutal btn-brutal-xs"
            >
              {submitting ? 'Generando...' : 'Pedir token'}
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setStep('collapsed');
              }}
              className="btn-brutal btn-brutal-xs btn-brutal-secondary"
            >
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          <p role="status" className="mt-2 text-sm font-bold text-ink">
            Token generado — mirá la consola del server y pegalo acá abajo.
          </p>
          <form onSubmit={handleReset} className="mt-4 space-y-4">
            <div>
              <label
                className="block text-sm font-bold text-ink"
                htmlFor="reset-token"
              >
                Token
              </label>
              <input
                id="reset-token"
                required
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="form-input"
                autoComplete="off"
              />
            </div>
            <div>
              <label
                className="block text-sm font-bold text-ink"
                htmlFor="reset-password"
              >
                Contraseña nueva
              </label>
              <input
                id="reset-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="form-input"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-brutal btn-brutal-xs"
              >
                {submitting ? 'Restableciendo...' : 'Restablecer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setStep('collapsed');
                }}
                className="btn-brutal btn-brutal-xs btn-brutal-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-4 border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
