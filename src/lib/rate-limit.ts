import { NextResponse } from 'next/server';
import { RateLimit } from '@/models/RateLimit';

export const RATE_LIMIT_MAX_ATTEMPTS = 10;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const RATE_LIMIT_EXCEEDED = {
  error: 'Demasiados intentos. Probá de nuevo más tarde.',
};

let rateLimitIndexesReady = false;

/**
 * Primer hop de `x-forwarded-for` (la IP real del cliente), o `'unknown'`
 * si el header no viene (tests/llamadas directas).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) {
    return 'unknown';
  }
  return forwarded.split(',')[0]?.trim() || 'unknown';
}

/**
 * Ventana fija por (ruta, ip): contador en la colección `ratelimits` con
 * TTL index en `resetAt` (limpieza automática) y upsert atómico.
 * Requiere que el caller ya haya conectado a Mongo (`connectDB()`).
 */
export async function isRateLimited(route: string, request: Request): Promise<boolean> {
  if (!rateLimitIndexesReady) {
    await RateLimit.init();
    rateLimitIndexesReady = true;
  }

  const windowStart = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  const key = `${route}:${getClientIp(request)}:${windowStart}`;

  const doc = await RateLimit.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { resetAt: new Date(windowStart + RATE_LIMIT_WINDOW_MS) },
    },
    { upsert: true, returnDocument: 'after' }
  );

  if (!doc) {
    return false;
  }

  return doc.count > RATE_LIMIT_MAX_ATTEMPTS;
}

export function rateLimitResponse(): NextResponse {
  return NextResponse.json(RATE_LIMIT_EXCEEDED, { status: 429 });
}
