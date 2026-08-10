import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getMonthRange } from '@/lib/monthly-date';
import { Category } from '@/models/Category';
import { FinancialProfile } from '@/models/FinancialProfile';
import { SavingsGoal } from '@/models/SavingsGoal';
import { Transaction } from '@/models/Transaction';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

const updateTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().trim().min(1).max(200).optional(),
  type: z
    .enum(['income', 'expense', 'saving', 'withdrawal', 'settlement'])
    .optional(),
  category: objectIdSchema.optional(),
  goal: objectIdSchema.optional(),
  paidBy: z.enum(['yo', 'pareja', 'compartido']).nullable().optional(),
  date: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
  isRecurring: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function shouldArchive(date: Date): Promise<boolean> {
  const profile = await FinancialProfile.findOne()
    .select('activeMonth')
    .lean();

  if (!profile?.activeMonth) {
    return false;
  }

  const { start } = getMonthRange(profile.activeMonth);
  return date.getTime() < start.getTime();
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;

    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'El identificador no es válido' }, { status: 400 });
    }

    await connectDB({ runMonthlyRollover: true });
    const deleted = await Transaction.findOneAndDelete({
      _id: id,
      archived: { $ne: true },
    });

    if (!deleted) {
      return NextResponse.json(
        { error: 'La transacción no existe o ya fue archivada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Transacción eliminada' });
  } catch (error: unknown) {
    console.error('Error eliminando transacción:', error);
    return NextResponse.json(
      { error: 'No se pudo eliminar la transacción' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = updateTransactionSchema.safeParse(body);

    if (!objectIdSchema.safeParse(id).success || !parsed.success) {
      return NextResponse.json(
        { error: parsed.success ? 'El identificador no es válido' : 'La transacción no es válida' },
        { status: 400 }
      );
    }

    await connectDB({ runMonthlyRollover: true });
    const transaction = await Transaction.findOne({
      _id: id,
      archived: { $ne: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'La transacción no existe o ya fue archivada' },
        { status: 404 }
      );
    }

    const data = parsed.data;
    const nextType = data.type ?? transaction.type;
    const nextPaidBy =
      data.paidBy !== undefined ? data.paidBy : transaction.paidBy ?? null;

    if (nextType === 'settlement') {
      if (nextPaidBy !== 'yo' && nextPaidBy !== 'pareja') {
        return NextResponse.json(
          { error: 'Indicá quién recibió la liquidación' },
          { status: 400 }
        );
      }

      transaction.category = undefined;
      transaction.goal = undefined;
      transaction.paidBy = nextPaidBy;
    } else if (nextType !== 'expense' && data.paidBy) {
      return NextResponse.json(
        { error: 'Solo los gastos admiten "¿Quién pagó?"' },
        { status: 400 }
      );
    }

    if (nextType === 'saving' || nextType === 'withdrawal') {
      const goalId = data.goal ?? String(transaction.goal ?? '');
      const goal = await SavingsGoal.findOne({ _id: goalId, active: true });

      if (!goal) {
        return NextResponse.json({ error: 'La meta no existe o está inactiva' }, { status: 404 });
      }

      transaction.goal = goalId;
      transaction.category = undefined;
    } else if (nextType !== 'settlement') {
      const categoryId = data.category ?? String(transaction.category ?? '');
      const category = await Category.findById(categoryId);

      if (!category) {
        return NextResponse.json({ error: 'La categoría no existe' }, { status: 404 });
      }

      if (category.type !== nextType) {
        return NextResponse.json(
          { error: 'La categoría no coincide con el tipo de movimiento' },
          { status: 400 }
        );
      }

      transaction.category = categoryId;
      transaction.goal = undefined;
    }

    transaction.type = nextType;
    if (nextType === 'expense') {
      transaction.paidBy = nextPaidBy;
    } else if (nextType !== 'settlement') {
      // Al salir de "gasto", el movimiento deja de participar del balance.
      transaction.paidBy = null;
    }
    if (data.amount !== undefined) transaction.amount = data.amount;
    if (data.description !== undefined) transaction.description = data.description;
    if (data.date !== undefined) {
      transaction.date = data.date;
      transaction.archived = await shouldArchive(data.date);
    }
    if (data.notes !== undefined) transaction.notes = data.notes;
    if (data.isRecurring !== undefined) transaction.isRecurring = data.isRecurring;

    await transaction.save();
    const populated = await transaction
      .populate('category', 'name color icon')
      .then((document) => document.populate('goal', 'name goalType currency'));

    return NextResponse.json(populated);
  } catch (error: unknown) {
    console.error('Error actualizando transacción:', error);
    return NextResponse.json(
      { error: 'No se pudo actualizar la transacción' },
      { status: 500 }
    );
  }
}
