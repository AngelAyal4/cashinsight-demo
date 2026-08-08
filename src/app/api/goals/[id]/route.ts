import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { SavingsGoal } from '@/models/SavingsGoal';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

interface RouteContext {
  params: Promise<{ id: string }>;
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

    await connectDB();
    const deleted = await SavingsGoal.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'La meta no existe' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Meta eliminada' });
  } catch (error: unknown) {
    console.error('Error eliminando meta:', error);
    return NextResponse.json({ error: 'No se pudo eliminar la meta' }, { status: 500 });
  }
}
