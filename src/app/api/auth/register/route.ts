import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { createSessionCookie } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { User } from '@/models/User';
import type { IUser } from '@/types';

const registerSchema = z.object({
  email: z.email({ message: 'Email inválido' }),
  password: z
    .string({ message: 'La contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(200, 'La contraseña no puede superar los 200 caracteres'),
});

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos de registro inválidos' },
        { status: 400 }
      );
    }

    await connectDB();
    await User.init();

    const email = parsed.data.email.toLowerCase().trim();
    const passwordHash = await hashPassword(parsed.data.password);

    const user = await User.create({ email, passwordHash });
    await createSessionCookie(user._id.toString());

    const publicUser: IUser = {
      _id: user._id.toString(),
      email: user.email,
    };

    return NextResponse.json({ user: publicUser }, { status: 201 });
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: 'Ya existe un usuario registrado' },
        { status: 409 }
      );
    }

    console.error('Error en registro de usuario:', error);
    return NextResponse.json(
      { error: 'No se pudo completar el registro' },
      { status: 500 }
    );
  }
}