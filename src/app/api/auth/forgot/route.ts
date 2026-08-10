import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  RESET_TOKEN_TTL_SECONDS,
  createPasswordResetToken,
} from '@/lib/password-reset';
import { User } from '@/models/User';

const GENERIC_RESPONSE = {
  message: 'Token de recuperación generado (revisá la consola del server)',
};

export async function POST() {
  try {
    await connectDB();

    const user = await User.findOne();

    if (!user) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const { token, tokenHash, expiresAt } = createPasswordResetToken(
      user._id.toString()
    );

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = expiresAt;
    await user.save();

    console.log(
      `[RECUPERACIÓN] Tu token (válido ${RESET_TOKEN_TTL_SECONDS / 60} min, un solo uso): ${token}`
    );

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error: unknown) {
    console.error('Error generando token de recuperación:', error);
    return NextResponse.json(
      { error: 'No se pudo generar el token de recuperación' },
      { status: 500 }
    );
  }
}
