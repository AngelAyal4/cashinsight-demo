import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-extrabold uppercase tracking-widest text-lime">
            CashinsightApp
          </p>
          <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-white">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm font-medium text-white/60">
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
        </div>
      </div>
    </main>
  );
}