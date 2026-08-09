import { NextResponse } from 'next/server';
import {
  destroySessionCookie,
  getSessionUserId,
  unauthorizedResponse,
} from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Budget } from '@/models/Budget';
import { Category } from '@/models/Category';
import { FinancialProfile } from '@/models/FinancialProfile';
import { MonthlySnapshot } from '@/models/MonthlySnapshot';
import { SavingsGoal } from '@/models/SavingsGoal';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';

export async function DELETE() {
  const userId = await getSessionUserId();

  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    await connectDB();

    await Promise.all([
      User.deleteOne({ _id: userId }),
      FinancialProfile.deleteMany({}),
      Transaction.deleteMany({}),
      SavingsGoal.deleteMany({}),
      Category.deleteMany({}),
      Budget.deleteMany({}),
      MonthlySnapshot.deleteMany({}),
    ]);

    await destroySessionCookie();

    return NextResponse.json({ message: 'Cuenta eliminada' });
  } catch (error: unknown) {
    console.error('Error eliminando cuenta:', error);
    return NextResponse.json(
      { error: 'No se pudo eliminar la cuenta' },
      { status: 500 }
    );
  }
}