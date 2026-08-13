import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reportes',
  description:
    'Historial de meses cerrados: cada cierre compacta tus movimientos en un snapshot.',
  robots: { index: false, follow: false },
};

export default function ReportLayout({ children }: LayoutProps<'/report'>) {
  return children;
}