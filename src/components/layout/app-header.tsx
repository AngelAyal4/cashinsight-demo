'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AvatarIcon } from '@/components/avatar/avatar-icon';
import type { AvatarId } from '@/types';

const navigation = [
  { href: '/', label: 'Principal' },
  { href: '/metas', label: 'Metas' },
];

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}

function HeaderAvatar() {
  const [avatar, setAvatar] = useState<AvatarId | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAvatar(): Promise<void> {
      try {
        const response = await fetch('/api/profile');
        const result: unknown = await response.json();

        if (!response.ok || !result || typeof result !== 'object') {
          return;
        }

        const profile = result as { avatar?: AvatarId };
        if (!cancelled && profile.avatar) {
          setAvatar(profile.avatar);
        }
      } catch {
        // El avatar es decorativo; si falla, no mostramos nada.
      }
    }

    void loadAvatar();
    return () => {
      cancelled = true;
    };
  }, []);

  return avatar ? (
    <AvatarIcon id={avatar} className="h-full w-full" />
  ) : (
    <UserIcon className="h-5 w-5 text-ink" />
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="border-b-4 border-ink bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/perfil"
          aria-label="Perfil"
          title="Perfil"
          className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition ${
            pathname === '/perfil'
              ? 'border-ink bg-lime shadow-[3px_3px_0_0_#111111]'
              : 'border-ink bg-white hover:bg-lime'
          }`}
        >
          <HeaderAvatar />
        </Link>
        <Link
          href="/"
          className="flex flex-1 items-center justify-center gap-2 text-xl font-extrabold tracking-tight text-ink"
        >
          <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-lime text-lg">
            $
          </span>
          <span className="truncate">CashinsightApp</span>
        </Link>
        <nav
          aria-label="Navegación principal"
          className="hidden shrink-0 sm:block"
        >
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
        <button
          type="button"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-white transition hover:bg-lime sm:hidden"
        >
          <span className="flex flex-col gap-1">
            <span
              className={`block h-0.5 w-4 bg-ink transition ${
                menuOpen ? 'translate-y-1.5 rotate-45' : ''
              }`}
            />
            <span
              className={`block h-0.5 w-4 bg-ink transition ${
                menuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block h-0.5 w-4 bg-ink transition ${
                menuOpen ? '-translate-y-1.5 -rotate-45' : ''
              }`}
            />
          </span>
        </button>
      </div>
      {menuOpen && (
        <nav
          aria-label="Navegación móvil"
          className="border-t-2 border-ink bg-white px-4 py-2 sm:hidden"
        >
          <ul className="flex flex-col gap-1 text-sm">
            {navigation.map((item) => {
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className={`block border-2 px-3 py-2 font-bold transition ${
                      isActive
                        ? 'border-ink bg-lime text-ink'
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
      )}
    </header>
  );
}
