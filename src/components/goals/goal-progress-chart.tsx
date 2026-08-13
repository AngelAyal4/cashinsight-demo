'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { GoalProgress } from '@/types';

export function GoalProgressChart({ goal }: { goal: GoalProgress }) {
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

  return (
    <div
      className="relative h-32 w-32 shrink-0 sm:h-40 sm:w-40"
      aria-label={`${goal.name}: ${goal.progressPercentage}% completado`}
    >
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 160, height: 160 }}>
        <PieChart>
          <Pie
            data={[{ value: goal.currentAmount }, { value: remainingAmount }]}
            dataKey="value"
            innerRadius="68%"
            outerRadius="88%"
            startAngle={90}
            endAngle={-270}
            stroke="#111111"
            strokeWidth={2}
            animationDuration={300}
          >
            <Cell fill={goal.isEmergency ? '#fbbf24' : '#7c3aed'} />
            <Cell fill="#e7e5e4" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xl font-extrabold text-ink">
        {goal.progressPercentage.toFixed(0)}%
      </p>
    </div>
  );
}