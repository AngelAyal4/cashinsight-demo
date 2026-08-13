import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-12 text-ink">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-lime">Error 404</p>
        <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight">Página no encontrada</h1>
        <p className="mt-3 text-sm font-medium text-ink/70">
          La ruta que buscás no existe o fue movida.
        </p>
        <Link href="/login" className="btn-brutal mt-6 inline-block">
          Ir a iniciar sesión
        </Link>
      </div>
    </main>
  );
}