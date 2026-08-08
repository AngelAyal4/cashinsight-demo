'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CategoryIcon } from '@/components/icons/category-icon';
import type { ExpenseByCategory } from '@/types';

const iconByName: Record<string, string> = {
  Alimentación: 'utensils',
  Transporte: 'car',
  Vivienda: 'home',
  Ocio: 'film',
  Salud: 'heart',
  Servicios: 'bolt',
  Impuesto: 'receipt',
  Tarjeta: 'card',
  Prestamos: 'banknote',
  Otro: 'dots',
  Sueldo: 'briefcase',
  Freelance: 'laptop',
  'Ahorro del mes': 'flag',
  'Sin asignar': 'dots',
};

interface ExpensesDonutChartProps {
  data: ExpenseByCategory[];
  loading?: boolean;
  className?: string;
}

export function ExpensesDonutChart({ data, loading, className }: ExpensesDonutChartProps) {
  const hasData = data.length > 0;

  return (
    <div className={`card-brutal flex h-full flex-col p-5 ${className ?? ''}`}>
      <div>
        <h2 className="text-lg font-extrabold uppercase tracking-tight text-ink">Distribución del ingreso</h2>
        <p className="mt-1 text-sm font-medium text-ink/70">Gastos, ahorro y dinero sin asignar del mes</p>
      </div>
      <div className="mt-4 min-h-72 flex-1">
        {loading || !hasData ? (
          <div className="flex h-full items-center justify-center">
            {loading ? (
              <div className="h-full w-full animate-pulse bg-ink/10" />
            ) : (
              <span className="text-sm font-bold text-ink/50">Sin movimientos este mes</span>
            )}
          </div>
        ) : (
          <div className="h-full w-full" aria-label="Gráfico de distribución del ingreso">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 420, height: 320 }}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="78%"
                  paddingAngle={2}
                  stroke="#111111"
                  strokeWidth={2}
                  animationDuration={300}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    typeof value === 'number'
                      ? value.toLocaleString('es-AR')
                      : String(value ?? '')
                  }
                  contentStyle={{
                    border: '2px solid #111111',
                    borderRadius: 0,
                    boxShadow: '4px 4px 0 0 #111111',
                    fontWeight: 700,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {hasData ? (
        <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Leyenda del gráfico">
          {data.map((entry) => (
            <li key={entry.name} className="flex items-center gap-2 text-xs font-bold text-ink">
              <span
                className="flex h-6 w-6 items-center justify-center border-2 border-ink text-ink"
                style={{ backgroundColor: entry.color }}
              >
                <CategoryIcon name={iconByName[entry.name]} className="h-3.5 w-3.5" />
              </span>
              {entry.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
