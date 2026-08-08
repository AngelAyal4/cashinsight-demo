import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { User } from '@/models/User';
import type { IUser } from '@/types';

export async function GET() {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    await connectDB();
    const user = await User.findById(userId);

    if (!user) {
      return unauthorizedResponse();
    }

    const publicUser: IUser = {
      _id: user._id.toString(),
      email: user.email,
    };

    return NextResponse.json({ user: publicUser });
  } catch (error: unknown) {
    console.error('Error obteniendo sesión:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener la sesión' },
      { status: 500 }
    );
  }
}