import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  signSessionToken,
  verifySessionToken,
} from '@/lib/session';

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token)?.sub ?? null;
}

export async function createSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, signSessionToken({ sub: userId }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(AUTH_COOKIE_NAME);
}

export function unauthorizedResponse(
  message = 'No autenticado'
): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}