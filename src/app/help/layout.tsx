import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ayuda',
  description:
    'Cómo usar CashinsightApp: mapa de la app, ciclo mensual, guías y preguntas frecuentes.',
  robots: { index: false, follow: false },
};

export default function HelpLayout({ children }: LayoutProps<'/help'>) {
  return children;
}