import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description: 'Registrá tu única cuenta en CashinsightApp: una app personal de presupuestos y metas de ahorro.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'CashinsightApp',
    description: 'Gestioná tus metas de ahorro y tus gastos de forma simple y brutalista.',
    type: 'website',
    url: '/register',
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

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-extrabold uppercase tracking-widest text-ink">
            CashinsightApp
          </p>
          <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-ink">
            Crear cuenta
          </h1>
          <p className="mt-2 text-sm font-medium text-ink/60">
            Esta app es de uso personal: registrá tu única cuenta.
          </p>
        </div>

        <div className="card-brutal animate-fade-in p-6">
          <AuthForm mode="register" />
          <p className="mt-5 text-center text-sm font-medium text-ink/70">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="font-bold text-ink underline">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}