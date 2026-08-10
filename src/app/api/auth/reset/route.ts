import { NextResponse } from 'next/server';
import { z } from 'zod';
import { destroySessionCookie } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import {
  hashPasswordResetToken,
  verifyPasswordResetToken,
} from '@/lib/password-reset';
import { User } from '@/models/User';

const resetSchema = z.object({
  token: z.string({ message: 'El token es obligatorio' }).trim().min(1, 'El token es obligatorio'),
  newPassword: z
    .string({ message: 'La contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(200, 'La contraseña no puede superar los 200 caracteres'),
});

const INVALID_TOKEN = {
  error: 'El token es inválido o expiró. Pedí uno nuevo.',
};

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = resetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      );
    }

    const payload = verifyPasswordResetToken(parsed.data.token);

    if (!payload) {
      return NextResponse.json(INVALID_TOKEN, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(payload.sub).select(
      '+passwordHash +passwordResetTokenHash +passwordResetExpiresAt'
    );

    if (!user?.passwordResetTokenHash || !user.passwordResetExpiresAt) {
      return NextResponse.json(INVALID_TOKEN, { status: 400 });
    }

    const tokenHash = hashPasswordResetToken(parsed.data.token);
    const expired = user.passwordResetExpiresAt.getTime() <= Date.now();

    if (tokenHash !== user.passwordResetTokenHash || expired) {
      return NextResponse.json(INVALID_TOKEN, { status: 400 });
    }

    user.passwordHash = await hashPassword(parsed.data.newPassword);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    await destroySessionCookie();

    return NextResponse.json({
      message: 'Contraseña actualizada. Iniciá sesión con tu nueva contraseña.',
    });
  } catch (error: unknown) {
    console.error('Error restableciendo la contraseña:', error);
    return NextResponse.json(
      { error: 'No se pudo restablecer la contraseña' },
      { status: 500 }
    );
  }
}
