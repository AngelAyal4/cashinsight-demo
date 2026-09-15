// Demo auto-login endpoint.
//
// When NEXT_PUBLIC_DEMO_MODE=true, this endpoint logs in the demo user
// without requiring password.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { createSessionCookie } from '@/lib/auth';
import { DEMO_CREDENTIALS } from '@/lib/demo';
import { User } from '@/models/User';
import type { IUser } from '@/types';

export async function POST() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Demo login no está habilitado' },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const email = DEMO_CREDENTIALS.email;
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario demo no encontrado. Ejecutá el seed primero.' },
        { status: 404 }
      );
    }

    await createSessionCookie(user._id.toString());

    const publicUser: IUser = {
      _id: user._id.toString(),
      email: user.email,
    };

    return NextResponse.json({ user: publicUser });
  } catch (error: unknown) {
    console.error('Error en demo-login:', error);
    return NextResponse.json(
      { error: 'No se pudo completar el login demo' },
      { status: 500 }
    );
  }
}
