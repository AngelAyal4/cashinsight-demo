import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { SavingsGoal } from '@/models/SavingsGoal';
import { getGoalsWithProgress } from '@/lib/goal-progress';

const goalSchema = z.object({
  name: z.string().trim().min(1).max(100),
  goalType: z.enum(['home', 'car', 'retirement', 'travel', 'custom']),
  targetAmount: z.number().positive(),
  currency: z.enum(['ARS', 'USD', 'EUR']),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  plannedMonthlyAmount: z.number().min(0).default(0),
});

export async function GET() {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    await connectDB({ runMonthlyRollover: true });
    return NextResponse.json(await getGoalsWithProgress());
  } catch (error: unknown) {
    console.error('Error obteniendo metas:', error);
    return NextResponse.json(
      { error: 'No se pudieron obtener las metas' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    const body: unknown = await request.json();
    const parsed = goalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'La meta no es válida' },
        { status: 400 }
      );
    }

    await connectDB({ runMonthlyRollover: true });
    const goal = await SavingsGoal.create({
      ...parsed.data,
      deadline: parsed.data.deadline
        ? new Date(`${parsed.data.deadline}T12:00:00`)
        : undefined,
      isEmergency: false,
      active: true,
    });

    const createdGoal = (await getGoalsWithProgress()).find(
      (item) => item._id === String(goal._id)
    );

    return NextResponse.json(createdGoal ?? goal, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creando meta:', error);
    return NextResponse.json(
      { error: 'No se pudo crear la meta' },
      { status: 500 }
    );
  }
}
