import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { createSessionCookie } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { User } from '@/models/User';
import type { IUser } from '@/types';

const loginSchema = z.object({
  email: z.email({ message: 'Email inválido' }),
  password: z
    .string({ message: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria')
    .max(200, 'La contraseña no puede superar los 200 caracteres'),
});

const INVALID_CREDENTIALS = { error: 'Credenciales inválidas' };

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos de login inválidos' },
        { status: 400 }
      );
    }

    await connectDB();

    const email = parsed.data.email.toLowerCase().trim();
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
    }

    const passwordOk = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!passwordOk) {
      return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
    }

    await createSessionCookie(user._id.toString());

    const publicUser: IUser = {
      _id: user._id.toString(),
      email: user.email,
    };

    return NextResponse.json({ user: publicUser });
  } catch (error: unknown) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'No se pudo completar el login' },
      { status: 500 }
    );
  }
}