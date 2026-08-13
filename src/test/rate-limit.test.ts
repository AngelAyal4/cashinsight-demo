import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectDB } from '@/lib/db';
import { AUTH_COOKIE_NAME, signSessionToken } from '@/lib/session';
import { hashPassword } from '@/lib/password';
import { RATE_LIMIT_WINDOW_MS } from '@/lib/rate-limit';
import { User } from '@/models/User';
import { RateLimit } from '@/models/RateLimit';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { GET as categoriesGET } from '@/app/api/categories/route';

const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, string>() }));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name) as string } : undefined,
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
}));

const API_URL = 'http://localhost';

function loginRequest(ip: string): Request {
  return new Request(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify({ email: 'rate@example.com', password: 'wrongpass1' }),
  });
}

async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

function rateLimitKey(route: string, ip: string): string {
  const windowStart = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  return `${route}:${ip}:${windowStart}`;
}

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Rate limiting en auth', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await RateLimit.deleteMany({});
    cookieJar.clear();
  });

  it('bloquea con 429 al 11° intento de login desde la misma IP', async () => {
    await User.init();
    await User.create({
      email: 'rate@example.com',
      passwordHash: await hashPassword('password123'),
    });

    for (let attempt = 1; attempt <= 10; attempt++) {
      const response = await loginPOST(loginRequest('1.2.3.4'));
      expect(response.status).toBe(401);
    }

    const blocked = await loginPOST(loginRequest('1.2.3.4'));
    expect(blocked.status).toBe(429);
    const body = await bodyOf(blocked);
    expect(String(body.error)).toBe('Demasiados intentos. Probá de nuevo más tarde.');
  });

  it('una IP distinta no queda bloqueada y la ventana nueva libera la misma IP', async () => {
    await User.init();
    await User.create({
      email: 'rate@example.com',
      passwordHash: await hashPassword('password123'),
    });

    for (let attempt = 1; attempt <= 11; attempt++) {
      await loginPOST(loginRequest('1.2.3.4'));
    }
    expect((await loginPOST(loginRequest('1.2.3.4'))).status).toBe(429);

    const otherIp = await loginPOST(loginRequest('5.6.7.8'));
    expect(otherIp.status).toBe(401);

    await RateLimit.deleteMany({});

    const afterWindow = await loginPOST(loginRequest('1.2.3.4'));
    expect(afterWindow.status).toBe(401);
  });

  it('las rutas privadas no se ven afectadas por el rate limit', async () => {
    await User.init();
    const user = await User.create({
      email: 'private@example.com',
      passwordHash: await hashPassword('password123'),
    });
    cookieJar.set(AUTH_COOKIE_NAME, signSessionToken({ sub: user._id.toString() }));

    await RateLimit.create({ key: rateLimitKey('login', '1.2.3.4'), count: 99, resetAt: new Date() });

    const response = await categoriesGET();
    expect(response.status).not.toBe(429);
  });

  it('el bloqueo de login no afecta a register desde la misma IP', async () => {
    await RateLimit.create({ key: rateLimitKey('login', '1.2.3.4'), count: 99, resetAt: new Date() });

    const response = await registerPOST(
      new Request(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '1.2.3.4',
        },
        body: JSON.stringify({ email: 'nuevo@example.com', password: 'password123' }),
      })
    );

    expect(response.status).toBe(201);
  });
});
