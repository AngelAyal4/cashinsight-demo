import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-extrabold uppercase tracking-widest text-lime">
            CashinsightApp
          </p>
          <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-white">
            Crear cuenta
          </h1>
          <p className="mt-2 text-sm font-medium text-white/60">
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