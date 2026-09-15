import { NextResponse } from 'next/server';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { MonthlySnapshot } from '@/models/MonthlySnapshot';

export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    await connectDB();

    const result = await MonthlySnapshot.deleteMany({});

    return NextResponse.json(
      { message: 'Reportes eliminados', deletedCount: result.deletedCount },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error eliminando reportes:', error);
    return NextResponse.json(
      { error: 'Error al eliminar los reportes' },
      { status: 500 }
    );
  }
}
