'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const isLogin = mode === 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        setError(
          typeof result === 'object' &&
            result !== null &&
            'error' in result
            ? String(result.error)
            : 'Ocurrió un error inesperado'
        );
        return;
      }

      const destination = isLogin
        ? (redirect ?? '/')
        : '/onboarding';
      router.replace(destination);
      router.refresh();
    } catch {
      setError('No se pudo conectar con el servidor. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label className="block text-sm font-bold text-ink" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="form-input"
          aria-describedby={error ? 'auth-error' : undefined}
          aria-invalid={error ? true : undefined}
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-ink" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          required
          minLength={isLogin ? undefined : 8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="form-input"
          aria-describedby={error ? 'auth-error' : undefined}
          aria-invalid={error ? true : undefined}
        />
      </div>

      {error ? (
        <p id="auth-error" role="alert" className="border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={submitting} className="btn-brutal w-full">
        {submitting
          ? 'Procesando...'
          : isLogin
            ? 'Iniciar sesión'
            : 'Crear cuenta'}
      </button>
    </form>
  );
}