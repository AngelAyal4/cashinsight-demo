import { NextResponse } from 'next/server';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { MonthlySnapshot } from '@/models/MonthlySnapshot';
import type { ReportListItem } from '@/types';

export async function GET() {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    await connectDB({ runMonthlyRollover: true });

    const snapshots = await MonthlySnapshot.find()
      .sort({ monthKey: -1 })
      .lean();

    const reports: ReportListItem[] = snapshots.map((snapshot) => ({
      monthKey: snapshot.monthKey,
      currency: snapshot.currency,
      income: snapshot.income,
      expenses: snapshot.expenses,
      savings: snapshot.savings,
      balance: snapshot.balance,
      financialScore: snapshot.financialScore,
      scoreMessage: snapshot.scoreMessage,
      transactionsCount: snapshot.transactionsCount,
    }));

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error obteniendo reportes:', error);
    return NextResponse.json(
      { error: 'No se pudieron obtener los reportes' },
      { status: 500 }
    );
  }
}