import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Perfil',
  description: 'Tu información financiera, monedas, reparto de gastos y cuenta.',
  robots: { index: false, follow: false },
};

export default function PerfilLayout({ children }: LayoutProps<'/perfil'>) {
  return children;
}