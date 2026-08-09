import { NextResponse } from 'next/server';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { MonthlySnapshot } from '@/models/MonthlySnapshot';
import { isValidMonthKey } from '@/lib/monthly-date';

interface RouteContext {
  params: Promise<{ monthKey: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    const { monthKey } = await context.params;

    if (!isValidMonthKey(monthKey)) {
      return NextResponse.json(
        { error: 'El mes debe tener formato AAAA-MM' },
        { status: 400 }
      );
    }

    await connectDB({ runMonthlyRollover: true });

    const snapshot = await MonthlySnapshot.findOne({ monthKey }).lean();

    if (!snapshot) {
      return NextResponse.json(
        { error: 'No existe un reporte para ese mes' },
        { status: 404 }
      );
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Error obteniendo reporte:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener el reporte' },
      { status: 500 }
    );
  }
}