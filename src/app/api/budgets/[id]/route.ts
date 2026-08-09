import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Budget } from '@/models/Budget';
import { getBudgetsWithProgress } from '@/lib/budget-progress';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const updateBudgetSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a cero').optional(),
  period: z.enum(['weekly', 'monthly', 'yearly'], 'El período no es válido').optional(),
  startDate: z.string().regex(datePattern, 'La fecha de inicio no es válida').optional(),
  endDate: z.string().regex(datePattern, 'La fecha de fin no es válida').optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = updateBudgetSchema.safeParse(body);

    if (!objectIdSchema.safeParse(id).success || !parsed.success) {
      return NextResponse.json(
        {
          error: parsed.success
            ? 'El identificador no es válido'
            : 'El presupuesto no es válido',
        },
        { status: 400 }
      );
    }

    await connectDB();
    const budget = await Budget.findById(id);

    if (!budget) {
      return NextResponse.json(
        { error: 'El presupuesto no existe' },
        { status: 404 }
      );
    }

    let startDate = budget.startDate;
    let endDate = budget.endDate;

    if (parsed.data.startDate !== undefined) {
      startDate = new Date(`${parsed.data.startDate}T00:00:00`);
    }

    if (parsed.data.endDate !== undefined) {
      endDate = new Date(`${parsed.data.endDate}T23:59:59`);
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior o igual a la de inicio' },
        { status: 400 }
      );
    }

    if (parsed.data.amount !== undefined) budget.amount = parsed.data.amount;
    if (parsed.data.period !== undefined) budget.period = parsed.data.period;
    budget.startDate = startDate;
    budget.endDate = endDate;

    await budget.save();
    const updated = (await getBudgetsWithProgress()).find(
      (item) => item._id === id
    );

    return NextResponse.json(updated ?? budget);
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: 'Ya existe un presupuesto para esa categoría en el mismo período' },
        { status: 409 }
      );
    }

    console.error('Error actualizando presupuesto:', error);
    return NextResponse.json(
      { error: 'No se pudo actualizar el presupuesto' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;

    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: 'El identificador no es válido' },
        { status: 400 }
      );
    }

    await connectDB();
    const deleted = await Budget.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'El presupuesto no existe' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Presupuesto eliminado' });
  } catch (error: unknown) {
    console.error('Error eliminando presupuesto:', error);
    return NextResponse.json(
      { error: 'No se pudo eliminar el presupuesto' },
      { status: 500 }
    );
  }
}