'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { NotificationsSection } from '@/components/profile/notifications-section';
import type { CurrencyCode, IFinancialProfile } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<IFinancialProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>('ARS');
  const [savingsCurrency, setSavingsCurrency] = useState<CurrencyCode>('ARS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile(): Promise<void> {
      try {
        const response = await fetch('/api/profile');
        const result: unknown = await response.json();

        if (!response.ok || !result || typeof result !== 'object') {
          throw new Error('No se pudo cargar el perfil');
        }

        const loadedProfile = result as IFinancialProfile & { email?: string };
        setProfile(loadedProfile);
        setName(loadedProfile.name);
        setEmail(loadedProfile.email ?? '');
        setBaseCurrency(loadedProfile.baseCurrency);
        setSavingsCurrency(loadedProfile.savingsCurrency);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el perfil');
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, baseCurrency, savingsCurrency }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result === 'object' && result !== null && 'error' in result
            ? String(result.error)
            : 'No se pudo actualizar el perfil'
        );
      }

      const updated = result as IFinancialProfile;
      setProfile(updated);
      setMessage('Perfil actualizado');
      window.location.reload();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword,
        }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result === 'object' && result !== null && 'error' in result
            ? String(result.error)
            : 'No se pudo cambiar la contraseña'
        );
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Contraseña actualizada');
    } catch (changeError: unknown) {
      setPasswordError(
        changeError instanceof Error ? changeError.message : 'No se pudo cambiar la contraseña'
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleLogout(): Promise<void> {
    setLoggingOut(true);

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Sin cookie, el proxy redirige a /login de todos modos.
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  async function handleDeleteAccount(): Promise<void> {
    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch('/api/auth/account', { method: 'DELETE' });

      if (!response.ok) {
        setDeleteError('No se pudo eliminar la cuenta. Intentá de nuevo.');
        setDeleting(false);
        return;
      }

      router.replace('/login');
      router.refresh();
    } catch {
      setDeleteError('No se pudo eliminar la cuenta. Intentá de nuevo.');
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-wider text-lime">Configuración</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Perfil y preferencias</h1>

        {loading ? (
          <div className="mt-8 h-72 animate-pulse bg-ink/10" />
        ) : profile ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <form onSubmit={handleSubmit} className="card-brutal animate-fade-in h-full space-y-4 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-bold text-ink">
                  Nombre
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="form-input"
                  />
                </label>
                <label className="block text-sm font-bold text-ink">
                  Email
                  <input
                    value={email}
                    readOnly
                    className="form-input cursor-not-allowed bg-paper/50"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-bold text-ink">
                  Moneda de uso diario
                  <select value={baseCurrency} onChange={(event) => setBaseCurrency(event.target.value as CurrencyCode)} className="form-input">
                    <option value="ARS">Peso argentino (ARS)</option>
                    <option value="USD">Dólar estadounidense (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </label>
                <label className="block text-sm font-bold text-ink">
                  Moneda de ahorro
                  <select value={savingsCurrency} onChange={(event) => setSavingsCurrency(event.target.value as CurrencyCode)} className="form-input">
                    <option value="ARS">Peso argentino (ARS)</option>
                    <option value="USD">Dólar estadounidense (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </label>
              </div>

              {message ? (
                <p className="border-2 border-ink bg-emerald-500 p-3 font-semibold text-white">
                  {message}
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700">
                  {error}
                </p>
              ) : null}
              <button type="submit" disabled={saving} className="btn-brutal">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>

              <div className="border-t-2 border-ink pt-5">
                <h3 className="text-sm font-extrabold uppercase tracking-tight">Contraseña</h3>
                <div className="mt-3 space-y-4">
                  <label className="block text-sm font-bold text-ink">
                    Contraseña actual
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className="form-input"
                      autoComplete="current-password"
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-bold text-ink">
                      Nueva contraseña
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleChangePassword();
                          }
                        }}
                        className="form-input"
                        autoComplete="new-password"
                      />
                    </label>
                    <label className="block text-sm font-bold text-ink">
                      Confirmar contraseña
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleChangePassword();
                          }
                        }}
                        className="form-input"
                        autoComplete="new-password"
                      />
                    </label>
                  </div>
                  {passwordMessage ? (
                    <p className="border-2 border-ink bg-emerald-500 p-3 font-semibold text-white">
                      {passwordMessage}
                    </p>
                  ) : null}
                  {passwordError ? (
                    <p role="alert" className="border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700">
                      {passwordError}
                    </p>
                  ) : null}
                  <button type="button" onClick={handleChangePassword} disabled={passwordSaving} className="btn-brutal">
                    {passwordSaving ? 'Guardando...' : 'Cambiar contraseña'}
                  </button>
                </div>
              </div>
              <div className="border-t-2 border-ink pt-5">
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={loggingOut}
                  className="btn-brutal btn-brutal-danger w-full"
                >
                  {loggingOut ? 'Saliendo...' : 'Cerrar sesión'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setConfirmingDelete(true);
                  }}
                  disabled={deleting}
                  className="mt-3 w-full bg-ink px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-rose-700"
                >
                  Eliminar cuenta
                </button>
              </div>
            </form>
<div className="flex flex-col gap-6">
              <aside className="card-brutal animate-fade-in flex flex-col p-5" style={{ animationDelay: '100ms' }}>
              <h2 className="text-lg font-extrabold uppercase tracking-tight">Recomendaciones</h2>
              <ul className="mt-3 flex-1 space-y-3 text-sm font-medium text-ink/80">
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 bg-lime border border-ink" />
                  Registrá los gastos del día para que el puntaje refleje tu situación real.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 bg-lime border border-ink" />
                  Usá “Ahorro o meta” cuando separes dinero para no contabilizarlo como un gasto común.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 bg-lime border border-ink" />
                  Priorizá tus ahorros como un gasto fijo más para ser constante con tus metas.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 bg-lime border border-ink" />
                  Revisá tus metas al cierre de cada mes y ajustá prioridades si cambió tu ingreso.
                </li>
                 <li className="flex gap-2">
                   <span className="mt-1 h-2 w-2 shrink-0 bg-lime border border-ink" />
                   Apuntá a un fondo de emergencia de 3 a 6 meses de tus gastos fijos.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 bg-lime border border-ink" />
                  Revisá cada mes tus suscripciones y bajá las que ya no usás.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 bg-lime border border-ink" />
                  Pagá primero las deudas con mayor interés y evitá nuevos consumos con tarjeta.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 bg-lime border border-ink" />
                  Anotá también los montos chicos: un café por día se acumula en el mes.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 bg-lime border border-ink" />
                  Compará cada cierre de mes lo presupuestado contra lo gastado para ajustar prioridades.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 bg-lime border border-ink" />
                   Mantené actualizados tus ingresos y gastos fijos para que el puntaje sea fiel a tu realidad.
                 </li>
               </ul>
               <Link href="/help" className="btn-brutal btn-brutal-secondary mt-4 block text-center">
                 Obtener más ayuda
               </Link>
              </aside>
              <NotificationsSection />
            </div>
          </div>
        ) : (
          <section className="mt-8 border-2 border-ink bg-blue-600 p-6 text-white shadow-[4px_4px_0_0_#111111]">
            <h2 className="font-extrabold uppercase tracking-tight">Todavía no hay un perfil configurado</h2>
            <a href="/onboarding" className="btn-brutal btn-brutal-secondary mt-3">
              Completar onboarding
            </a>
          </section>
        )}
      </main>

      {confirmingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar eliminación de cuenta"
        >
          <div className="card-brutal w-full max-w-md p-5 sm:p-6">
            <h2 className="text-xl font-extrabold uppercase tracking-tight text-ink">
              ¿Eliminar tu cuenta?
            </h2>
            <p className="mt-3 text-sm font-medium text-ink/70">
              Se borrarán tu cuenta, perfil, transacciones, categorías y
              metas. Esta acción no se puede deshacer.
            </p>
            {deleteError ? (
              <p role="alert" className="mt-3 border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700">
                {deleteError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="btn-brutal btn-brutal-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={deleting}
                className="btn-brutal btn-brutal-danger"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
