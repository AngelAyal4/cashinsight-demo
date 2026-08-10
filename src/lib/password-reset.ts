import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';

export const RESET_TOKEN_TTL_SECONDS = 15 * 60;
const RESET_TOKEN_PURPOSE = 'reset';

export interface ResetTokenPayload {
  sub: string;
}

export interface PasswordResetToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está definido en las variables de entorno');
  }
  return secret;
}

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createPasswordResetToken(
  userId: string,
  ttlSeconds: number = RESET_TOKEN_TTL_SECONDS
): PasswordResetToken {
  const token = jwt.sign(
    {
      sub: userId,
      purpose: RESET_TOKEN_PURPOSE,
      jti: randomBytes(32).toString('hex'),
    },
    getSecret(),
    { algorithm: 'HS256', expiresIn: ttlSeconds }
  );

  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  };
}

export function verifyPasswordResetToken(
  token: string
): ResetTokenPayload | null {
  try {
    if (!process.env.JWT_SECRET) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      typeof decoded.sub === 'string' &&
      (decoded as { purpose?: unknown }).purpose === RESET_TOKEN_PURPOSE
    ) {
      return { sub: decoded.sub };
    }

    return null;
  } catch {
    return null;
  }
}
