import { NextResponse } from 'next/server';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { MonthlySnapshot } from '@/models/MonthlySnapshot';
import { Transaction } from '@/models/Transaction';
import { isValidMonthKey } from '@/lib/monthly-date';

interface RouteContext {
  params: Promise<{ monthKey: string }>;
}

export async function DELETE(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const monthKey = await context.params;
  const { monthKey: key } = monthKey;

  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    await connectDB();

    if (!isValidMonthKey(key)) {
      return NextResponse.json(
        { error: 'El mes debe tener formato AAAA-MM' },
        { status: 400 }
      );
    }

    const snapshot = await MonthlySnapshot.findOne({ monthKey: key });
    if (!snapshot) {
      return NextResponse.json(
        { error: 'No existe un reporte para ese mes' },
        { status: 404 }
      );
    }

    await MonthlySnapshot.deleteOne({ monthKey: key });

    return NextResponse.json({ message: 'Reporte eliminado' }, { status: 200 });
  } catch (error) {
    console.error('Error eliminando reporte:', error);
    return NextResponse.json(
      { error: 'No se pudo eliminar el reporte' },
      { status: 500 }
    );
  }
}
