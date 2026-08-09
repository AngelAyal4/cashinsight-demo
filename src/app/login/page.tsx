import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';

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
        </div>
      </div>
    </main>
  );
}