import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { Category } from '@/models/Category';
import { SavingsGoal } from '@/models/SavingsGoal';
import { Transaction } from '@/models/Transaction';
import { FinancialProfile } from '@/models/FinancialProfile';
import { connectDB } from '@/lib/db';
import { getMonthKey, getMonthRange } from '@/lib/monthly-date';

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'El identificador no es válido');

const baseTransactionSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a cero'),
  description: z.string().trim().min(1).max(200),
  date: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
  isRecurring: z.boolean().default(false),
});

/** Solo los gastos participan del balance de pareja. */
const paidBySchema = z.enum(['yo', 'pareja', 'compartido']).nullable().optional();
/** El resto de los tipos rechaza un paidBy explícito (400). */
const noPaidBySchema = z.null({ message: 'Solo los gastos admiten "¿Quién pagó?"' }).optional();

const transactionSchema = z.discriminatedUnion('type', [
  baseTransactionSchema.extend({
    type: z.literal('income'),
    category: objectIdSchema,
    paidBy: noPaidBySchema,
  }),
  baseTransactionSchema.extend({
    type: z.literal('expense'),
    category: objectIdSchema,
    paidBy: paidBySchema,
  }),
  baseTransactionSchema.extend({
    type: z.literal('saving'),
    goal: objectIdSchema,
    paidBy: noPaidBySchema,
  }),
  baseTransactionSchema.extend({
    type: z.literal('withdrawal'),
    goal: objectIdSchema,
    paidBy: noPaidBySchema,
  }),
  baseTransactionSchema.extend({
    type: z.literal('settlement'),
    paidBy: z.enum(['yo', 'pareja'], {
      message: 'Indicá quién recibió la liquidación',
    }),
  }),
]);

const querySchema = z.object({
  type: z
    .enum(['income', 'expense', 'saving', 'withdrawal', 'settlement'])
    .optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'El mes debe tener formato AAAA-MM')
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/** Las transacciones con fecha anterior al mes activo se guardan archivadas. */
async function resolveArchived(date: Date): Promise<boolean> {
  const profile = await FinancialProfile.findOne()
    .select('activeMonth')
    .lean();

  if (!profile?.activeMonth) {
    return false;
  }

  const { start } = getMonthRange(profile.activeMonth);
  return date.getTime() < start.getTime();
}

export async function GET(request: Request) {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const parsedQuery = querySchema.safeParse({
      type: url.searchParams.get('type') ?? undefined,
      month: url.searchParams.get('month') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: parsedQuery.error.issues[0]?.message ?? 'Filtros inválidos' },
        { status: 400 }
      );
    }

    await connectDB({ runMonthlyRollover: true });
    const profile = await FinancialProfile.findOne().select('activeMonth').lean();
    const activeMonth = profile?.activeMonth ?? getMonthKey();
    const { type, month, limit } = parsedQuery.data;
    const filter: Record<string, unknown> = {
      archived: { $ne: true },
    };

    if (type) {
      filter.type = type;
    }

    if (month) {
      const range = getMonthRange(month);
      filter.date = { $gte: range.start, $lt: range.end };
    } else {
      // Listado del ciclo activo: no muestra meses cerrados.
      const { start, end } = getMonthRange(activeMonth);
      filter.date = { $gte: start, $lt: end };
    }

    const transactions = await Transaction.find(filter)
      .populate('category', 'name color icon')
      .populate('goal', 'name goalType currency')
      .sort({ date: -1 })
      .limit(limit);

    return NextResponse.json(transactions);
  } catch (error: unknown) {
    console.error('Error obteniendo transacciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener transacciones' },
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
    const parsed = transactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'La transacción no es válida' },
        { status: 400 }
      );
    }

    await connectDB({ runMonthlyRollover: true });
    const data = parsed.data;

    if (data.type === 'saving' || data.type === 'withdrawal') {
      const goal = await SavingsGoal.findOne({ _id: data.goal, active: true });

      if (!goal) {
        return NextResponse.json(
          { error: 'La meta seleccionada no existe o está inactiva' },
          { status: 404 }
        );
      }
    } else if (data.type !== 'settlement') {
      const category = await Category.findById(data.category);

      if (!category) {
        return NextResponse.json(
          { error: 'La categoría seleccionada no existe' },
          { status: 404 }
        );
      }

      if (category.type !== data.type) {
        return NextResponse.json(
          { error: 'La categoría no coincide con el tipo de movimiento' },
          { status: 400 }
        );
      }
    }

    const date = data.date ?? new Date();
    const transaction = await Transaction.create({
      ...data,
      date,
      archived: await resolveArchived(date),
    });
    const populated = await transaction
      .populate('category', 'name color icon')
      .then((document) => document.populate('goal', 'name goalType currency'));

    return NextResponse.json(populated, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creando transacción:', error);
    return NextResponse.json(
      { error: 'Error al crear la transacción' },
      { status: 500 }
    );
  }
}