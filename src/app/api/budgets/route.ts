import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Budget } from '@/models/Budget';
import { Category } from '@/models/Category';
import { getBudgetsWithProgress } from '@/lib/budget-progress';

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'El identificador no es válido');

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const budgetSchema = z.object({
  category: objectIdSchema,
  amount: z.number().positive('El monto debe ser mayor a cero'),
  period: z.enum(['weekly', 'monthly', 'yearly'], 'El período no es válido'),
  startDate: z.string().regex(datePattern, 'La fecha de inicio no es válida'),
  endDate: z.string().regex(datePattern, 'La fecha de fin no es válida'),
});

function budgetRange(data: {
  startDate: string;
  endDate: string;
}): { start: Date; end: Date; isValid: boolean } {
  const start = new Date(`${data.startDate}T00:00:00`);
  const end = new Date(`${data.endDate}T23:59:59`);
  const isValid =
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    end >= start;

  return { start, end, isValid };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

export async function GET() {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    await connectDB();
    return NextResponse.json(await getBudgetsWithProgress());
  } catch (error: unknown) {
    console.error('Error obteniendo presupuestos:', error);
    return NextResponse.json(
      { error: 'No se pudieron obtener los presupuestos' },
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
    const parsed = budgetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'El presupuesto no es válido' },
        { status: 400 }
      );
    }

    const { start, end, isValid } = budgetRange(parsed.data);
    if (!isValid) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior o igual a la de inicio' },
        { status: 400 }
      );
    }

    await connectDB();
    const category = await Category.findById(parsed.data.category);

    if (!category) {
      return NextResponse.json(
        { error: 'La categoría seleccionada no existe' },
        { status: 404 }
      );
    }

    if (category.type !== 'expense') {
      return NextResponse.json(
        { error: 'Solo se pueden presupuestar categorías de gasto' },
        { status: 400 }
      );
    }

    const budget = await Budget.create({
      category: parsed.data.category,
      amount: parsed.data.amount,
      period: parsed.data.period,
      startDate: start,
      endDate: end,
    });

    const created = (await getBudgetsWithProgress()).find(
      (item) => item._id === String(budget._id)
    );

    return NextResponse.json(created ?? budget, { status: 201 });
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: 'Ya existe un presupuesto para esa categoría en el mismo período' },
        { status: 409 }
      );
    }

    console.error('Error creando presupuesto:', error);
    return NextResponse.json(
      { error: 'No se pudo crear el presupuesto' },
      { status: 500 }
    );
  }
}