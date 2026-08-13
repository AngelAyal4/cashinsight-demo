import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Control',
  description:
    'Límites de gasto por categoría variable: definí topes y seguí tu progreso del mes.',
  robots: { index: false, follow: false },
};

export default function ControlLayout({ children }: LayoutProps<'/control'>) {
  return children;
}