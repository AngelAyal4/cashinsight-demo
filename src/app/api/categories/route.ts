import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Category } from '@/models/Category';

const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(['income', 'expense']),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'El color debe tener formato #rrggbb')
    .optional(),
  icon: z.string().trim().max(50).optional(),
  isDefault: z.boolean().default(false),
  behavior: z.enum(['fijo', 'variable']).optional(),
});

export async function GET() {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    await connectDB({ runMonthlyRollover: true });
    const categories = await Category.find().sort({ name: 1 });
    const sortedCategories = categories
      .slice()
      .sort((a, b) => {
        const aIsOther = a.name === 'Otro' ? 1 : 0;
        const bIsOther = b.name === 'Otro' ? 1 : 0;

        if (aIsOther !== bIsOther) {
          return aIsOther - bIsOther;
        }

        return a.name.localeCompare(b.name, 'es');
      });
    return NextResponse.json(sortedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    await connectDB({ runMonthlyRollover: true });
    const body: unknown = await request.json();
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'La categoría no es válida' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const { behavior, ...rest } = data;
    const category = await Category.create({
      ...rest,
      // Las categorías de gasto sin comportamiento explícito son variables por defecto.
      ...(data.type === 'expense'
        ? { behavior: behavior ?? 'variable' }
        : {}),
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating category:', error);
    const message =
      error instanceof Error ? error.message : 'Error al crear categoría';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}