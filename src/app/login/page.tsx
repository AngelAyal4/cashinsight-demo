import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/auth-form';
import { PasswordRecovery } from '@/components/auth/password-recovery';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description:
    'Ingresá a CashinsightApp para ver tu presupuesto del mes, tus límites de gasto y tus metas de ahorro.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'CashinsightApp',
    description: 'Gestioná tus metas de ahorro y tus gastos de forma simple y brutalista.',
    type: 'website',
    url: '/login',
    siteName: 'CashinsightApp',
    locale: 'es_AR',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'CashinsightApp — finanzas personales mensuales',
      },
    ],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'CashinsightApp',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  inLanguage: 'es',
  description:
    'App privada de presupuestos personales: ingresos, límites de gasto, metas de ahorro y reportes mensuales.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-lime text-lg font-extrabold text-ink">
            $
          </span>
          <p className="text-xl font-extrabold tracking-tight text-ink">CashinsightApp</p>
        </div>
        <div className="mb-8 text-center">
          <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-ink">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm font-medium text-ink/60">
            Ingresá con tu cuenta para ver tu dashboard.
          </p>
        </div>

        <div className="card-brutal animate-fade-in p-6">
          <AuthForm mode="login" />
          <p className="mt-5 text-center text-sm font-medium text-ink/70">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="font-bold text-ink underline">
              Registrate
            </Link>
          </p>
          <PasswordRecovery />
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}