import jwt from 'jsonwebtoken';

export const AUTH_COOKIE_NAME = 'auth_token';
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export interface SessionPayload {
  sub: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está definido en las variables de entorno');
  }
  return secret;
}

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, getSecret(), {
    algorithm: 'HS256',
    expiresIn: SESSION_DURATION_SECONDS,
  });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    if (!process.env.JWT_SECRET) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    if (typeof decoded === 'object' && decoded !== null && typeof decoded.sub === 'string') {
      return { sub: decoded.sub };
    }

    return null;
  } catch {
    return null;
  }
}