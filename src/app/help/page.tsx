'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/layout/app-header';

const appMap = [
  {
    href: '/',
    title: 'Principal',
    role: 'Tu presupuesto general: ingresos, fijos, variables y cuánto te queda para gastar por día.',
  },
  {
    href: '/control',
    title: 'Control',
    role: 'Límites de gasto por categoría variable: ocio, comida, compras. El progreso del mes se reinicia al cerrar el ciclo.',
  },
  {
    href: '/metas',
    title: 'Metas',
    role: 'Tus objetivos de ahorro: fondo de emergencia, viajes, retiro, con aportes y avance.',
  },
  {
    href: '/report',
    title: 'Reportes',
    role: 'Historial de meses cerrados: cada cierre compacta tus movimientos en un snapshot.',
  },
  {
    href: '/perfil',
    title: 'Perfil',
    role: 'Tu información, fuentes de gastos fijos, monedas, contraseña y datos de tu cuenta.',
  },
];

const quickGuides = [
  {
    title: 'Cargar mi primer ingreso',
    steps: [
      'En Principal, tocá "Cargar mi ingreso".',
      'Elegí tipo Ingreso, un monto y una categoría (Sueldo o Freelance).',
      'Dale a "Registrar" y vas a ver el disponible para gastar.',
    ],
  },
  {
    title: 'Poner un límite de gasto en Control',
    steps: [
      'Andá a Control y tocá "Nuevo límite".',
      'Elegí una categoría de gasto variable (Alimentación, Ocio, Salud...).',
      'Definí el monto y el período: el progreso resetea cada mes.',
    ],
  },
  {
    title: 'Crear una meta de ahorro',
    steps: [
      'Andá a Metas y creá tu objetivo (viaje, retiro, lo que sea).',
      'Registrá un Ahorro o meta con el monto que querés apartar.',
      'Cada informe muestra el avance y el aporte del mes.',
    ],
  },
  {
    title: 'Leer mi reporte mensual',
    steps: [
      'Andá a Reportes (disponible un mes cerrado o más).',
      'Elegí un mes y mirá el balance, cumplimiento de límites y metas.',
      'Compará meses para ver tu evolución.',
    ],
  },
];

const tips = [
  'Registrá los gastos apenas ocurren: el disponible y los límites se actualizan solos.',
  'Revisá Control a mitad de mes para no exceder un límite cuando avisás el gasto justo.',
  'Aportá a tus metas apenas entra el ingreso: el ahorro primero, el resto después.',
];

const faq = [
  {
    question: '¿Se borran mis datos al cerrar el mes?',
    answer:
      'No. Al llegar el día 1 tus movimientos se compactan en un reporte y se marcan como archivados: siguen guardados y visibles en Reportes, pero dejan de contar en Principal.',
  },
  {
    question: '¿Qué pasa si no abro la app un par de meses?',
    answer:
      'Nada se pierde: cuando vuelvas, la app cierra todos los meses pendientes y genera el reporte de cada uno. Después seguís con el mes en curso.',
  },
  {
    question: '¿Puedo cambiar la moneda de mi presupuesto?',
    answer: 'Sí, desde Perfil editás tu moneda base y la de tus metas. Los reportes guardan la moneda del mes al momento del cierre.',
  },
  {
    question: 'Registré un gasto con fecha del mes pasado. ¿Qué pasa?',
    answer:
    'Se guarda igual, pero como ese mes ya está cerrado la transacción queda archivada: no aparece en tus listados activos, pero sigue existiendo en los datos históricos del mes.',
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-2 border-ink bg-white">
      <summary className="cursor-pointer list-none px-4 py-3 font-bold text-ink transition hover:bg-lime">
        <span className="flex items-center justify-between gap-2">
          {question}
          <span className="text-sm text-ink/50 transition group-open:rotate-45">+</span>
        </span>
      </summary>
      <p className="border-t-2 border-ink px-4 py-3 text-sm font-medium text-ink/80">
        {answer}
      </p>
    </details>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-lime">Ayuda</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
            Cómo usar CashinsightApp
          </h1>
          <p className="mt-2 text-sm font-medium text-ink/70">
            Tu centro de finanzas personales mensuales: ingresos, límites,
            metas y reportes de cada mes.
          </p>
        </div>

        <section className="mt-8" aria-label="Mapa de la app">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">
            Mapa de la app
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {appMap.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="card-brutal animate-fade-in p-4 transition hover:bg-lime"
              >
                <h3 className="font-extrabold text-ink">{page.title}</h3>
                <p className="mt-1 text-sm font-medium text-ink/70">{page.role}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 card-brutal p-5" aria-label="Ciclo mensual">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">
            Cómo funciona el ciclo mensual
          </h2>
          <p className="mt-2 text-sm font-medium text-ink/80">
            Tu mes arranca el día 1 en cero. Cada entrada, gasto y aporte
            cuenta para el mes en curso; al llegar el día 1, el mes anterior se
            compacta en un reporte histórico y el nuevo mes arranca limpio:
          </p>
          <ul className="mt-3 grid gap-2 text-sm font-medium text-ink/80 sm:grid-cols-3">
            <li className="border-2 border-ink bg-white p-3">
              <strong className="font-extrabold">Se compacta</strong> los
              movimientos pasan a Reportes (nunca se borran).
            </li>
            <li className="border-2 border-ink bg-white p-3">
              <strong className="font-extrabold">Se resetea</strong> el progreso
              de gasto del mes.
            </li>
            <li className="border-2 border-ink bg-white p-3">
              <strong className="font-extrabold">Persiste</strong> todo: límites
              de Control, perfil y metas quedan igual.
            </li>
          </ul>
        </section>

        <section className="mt-6" aria-label="Guías rápidas">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">
            Guías rápidas
          </h2>
          <div className="mt-3 space-y-3">
            {quickGuides.map((guide) => (
              <div key={guide.title} className="card-brutal p-4">
                <h3 className="font-extrabold text-ink">{guide.title}</h3>
                <ol className="mt-2 space-y-1 text-sm font-medium text-ink/80">
                  {guide.steps.map((step, index) => (
                    <li key={step}>
                      <span className="mr-1 font-extrabold text-lime">{index + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 card-brutal p-5" aria-label="Consejos de uso">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">
            Consejos de uso
          </h2>
          <ul className="mt-3 space-y-2 text-sm font-medium text-ink/80">
            {tips.map((tip) => (
              <li key={tip}>→ {tip}</li>
            ))}
          </ul>
        </section>

        <section className="mt-6" aria-label="Preguntas frecuentes">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">
            Preguntas frecuentes
          </h2>
          <div className="mt-3 space-y-3">
            {faq.map((item) => (
              <FaqItem
                key={item.question}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}