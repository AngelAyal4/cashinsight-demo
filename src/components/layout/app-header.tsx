'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { href: '/', label: 'Principal' },
  { href: '/metas', label: 'Metas' },
  { href: '/perfil', label: 'Perfil' },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b-4 border-ink bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-ink"
        >
          <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-lime text-lg">
            $
          </span>
          CashinsightApp
        </Link>
        <nav aria-label="Navegación principal">
          <ul className="flex flex-wrap items-center gap-2 text-sm">
            {navigation.map((item) => {
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`inline-block border-2 px-3 py-1.5 font-bold transition ${
                      isActive
                        ? 'border-ink bg-lime text-ink shadow-[3px_3px_0_0_#111111]'
                        : 'border-transparent text-ink hover:border-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
