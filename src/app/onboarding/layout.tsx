import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Configuración inicial',
  description:
    'Armá tu plan financiero: ingresos, gastos estimados y metas de ahorro.',
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: LayoutProps<'/onboarding'>) {
  return children;
}