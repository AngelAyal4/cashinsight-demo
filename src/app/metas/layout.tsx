import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Metas',
  description: 'Tus objetivos de ahorro con progreso, aportes y retiros.',
  robots: { index: false, follow: false },
};

export default function MetasLayout({ children }: LayoutProps<'/metas'>) {
  return children;
}