'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { AvatarIcon, avatarIds } from '@/components/avatar/avatar-icon';
import type { AvatarId, CurrencyCode, IFinancialProfile } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<IFinancialProfile | null>(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarId>('ren');
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>('ARS');
  const [savingsCurrency, setSavingsCurrency] = useState<CurrencyCode>('ARS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickering, setPickerOpen] = useState(false);
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

        const loadedProfile = result as IFinancialProfile;
        setProfile(loadedProfile);
        setName(loadedProfile.name);
        setAvatar(loadedProfile.avatar ?? 'ren');
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
        body: JSON.stringify({ name, avatar, baseCurrency, savingsCurrency }),
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
      setAvatar(updated.avatar ?? 'ren');
      setMessage('Perfil actualizado');
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

  async function handleAvatarChange(id: AvatarId) {
    setAvatar(id);
    setPickerOpen(false);

    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: id }),
      });
    } catch {
      // El perfil se guarda de nuevo al enviar el formulario.
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
            <form onSubmit={handleSubmit} className="card-brutal animate-fade-in h-full space-y-5 p-6">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-white transition"
                  aria-label="Cambiar avatar"
                >
                  <AvatarIcon id={avatar} className="h-full w-full transition group-hover:brightness-75" />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-white opacity-0 transition group-hover:opacity-100">
                    Editar
                  </span>
                </button>
                <div className="min-w-0">
                  <label className="block text-sm font-bold text-ink">
                    Nombre
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="form-input"
                    />
                  </label>
                </div>
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
                  <button type="button" onClick={handleChangePassword} disabled={passwordSaving} className="btn-brutal btn-brutal-secondary">
                    {passwordSaving ? 'Guardando...' : 'Cambiar contraseña'}
                  </button>
                  <span className="text-xs font-medium text-ink/60">Enter también guarda.</span>
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
                  className="mt-3 w-full border border-ink/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink/50 transition hover:border-rose-600 hover:text-rose-600"
                >
                  Eliminar cuenta
                </button>
              </div>
            </form>
<aside className="card-brutal animate-fade-in flex h-full flex-col p-6" style={{ animationDelay: '100ms' }}>
              <h2 className="text-lg font-extrabold uppercase tracking-tight">Recomendaciones</h2>
              <ul className="mt-4 flex-1 space-y-4 text-sm font-medium text-ink/80">
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
                  Aplicá la regla 50/30/20: la mitad a necesidades, 30% a deseos y 20% a ahorro.
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
            </aside>
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

      {pickering ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Elegir avatar"
        >
          <div
            className="card-brutal w-full max-w-md p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-3">
              <div>
                <h2 className="text-xl font-extrabold uppercase tracking-tight text-ink">Elegí tu avatar</h2>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Cerrar"
                className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-white font-extrabold text-ink transition hover:bg-lime"
              >
                X
              </button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-4">
              {avatarIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleAvatarChange(id)}
                  className={`flex items-center justify-center border-2 p-2 transition ${
                    avatar === id ? 'bg-lime' : 'bg-white hover:bg-paper'
                  }`}
                  aria-label={`Elegir avatar ${id}`}
                >
                  <AvatarIcon id={id} className="h-16 w-16" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

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