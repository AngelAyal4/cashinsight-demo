'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import type { CurrencyCode, IFinancialProfile } from '@/types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<IFinancialProfile | null>(null);
  const [name, setName] = useState('');
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>('ARS');
  const [savingsCurrency, setSavingsCurrency] = useState<CurrencyCode>('ARS');
  const [uiColor, setUiColor] = useState('#4f46e5');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setBaseCurrency(loadedProfile.baseCurrency);
        setSavingsCurrency(loadedProfile.savingsCurrency);
        setUiColor(loadedProfile.uiColor);
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
        body: JSON.stringify({ name, baseCurrency, savingsCurrency, uiColor }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result === 'object' && result !== null && 'error' in result
            ? String(result.error)
            : 'No se pudo actualizar el perfil'
        );
      }

      setProfile(result as IFinancialProfile);
      setMessage('Perfil actualizado');
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
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
            <form onSubmit={handleSubmit} className="card-brutal p-6">
              <h2 className="text-lg font-extrabold uppercase tracking-tight">Datos del perfil</h2>
              <label className="mt-5 block text-sm font-bold text-ink">
                Nombre
                <input value={name} onChange={(event) => setName(event.target.value)} className="form-input" />
              </label>
              <label className="mt-4 block text-sm font-bold text-ink">
                Moneda de uso diario
                <select value={baseCurrency} onChange={(event) => setBaseCurrency(event.target.value as CurrencyCode)} className="form-input">
                  <option value="ARS">Peso argentino (ARS)</option>
                  <option value="USD">Dólar estadounidense (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </label>
              <label className="mt-4 block text-sm font-bold text-ink">
                Moneda de ahorro
                <select value={savingsCurrency} onChange={(event) => setSavingsCurrency(event.target.value as CurrencyCode)} className="form-input">
                  <option value="ARS">Peso argentino (ARS)</option>
                  <option value="USD">Dólar estadounidense (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </label>
              <label className="mt-4 block text-sm font-bold text-ink">
                Color de la interfaz
                <input type="color" value={uiColor} onChange={(event) => setUiColor(event.target.value)} className="mt-2 h-11 w-full cursor-pointer border-2 border-ink bg-white p-1" />
              </label>
              {message ? (
                <p className="mt-4 border-2 border-ink bg-emerald-500 p-3 font-semibold text-white">
                  {message}
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="mt-4 border-2 border-rose-600 bg-rose-50 p-3 font-semibold text-rose-700">
                  {error}
                </p>
              ) : null}
              <button type="submit" disabled={saving} className="btn-brutal mt-5">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
            <aside className="card-brutal p-6">
              <h2 className="text-lg font-extrabold uppercase tracking-tight">Recomendaciones</h2>
              <ul className="mt-4 space-y-4 text-sm font-medium text-ink/80">
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
                  Revisá tus metas al cierre de cada mes y ajustá prioridades si cambió tu ingreso.
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
    </div>
  );
}
