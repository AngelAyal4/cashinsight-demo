import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectDB } from '@/lib/db';
import { AUTH_COOKIE_NAME, signSessionToken } from '@/lib/session';
import { hashPassword } from '@/lib/password';
import {
  createPasswordResetToken,
  hashPasswordResetToken,
} from '@/lib/password-reset';
import { User } from '@/models/User';
import { POST as forgotPOST } from '@/app/api/auth/forgot/route';
import { POST as resetPOST } from '@/app/api/auth/reset/route';
import { POST as loginPOST } from '@/app/api/auth/login/route';

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
const CURRENT_PASSWORD = 'password123';
const NEW_PASSWORD = 'nuevaClave456';

function jsonRequest(url: string, body?: unknown): Request {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

async function createUser(email = 'reset@example.com'): Promise<string> {
  await User.init();
  const user = await User.create({
    email,
    passwordHash: await hashPassword(CURRENT_PASSWORD),
  });
  return user._id.toString();
}

/** Corre forgot y devuelve el token plano que la route imprime en consola. */
async function requestToken(): Promise<string> {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const response = await forgotPOST();
  expect(response.status).toBe(200);

  const logged = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
  logSpy.mockRestore();

  const token = logged.split(' ').at(-1) ?? '';
  expect(token.length).toBeGreaterThan(0);
  return token;
}

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Recuperación de contraseña', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    cookieJar.clear();
  });

  it('forgot genera el token, lo imprime en consola y guarda solo el hash', async () => {
    await createUser();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const response = await forgotPOST();

    expect(response.status).toBe(200);
    const body = await bodyOf(response);
    expect(String(body.message)).toContain('consola del server');

    const logged = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
    logSpy.mockRestore();

    expect(logged).toContain('[RECUPERACIÓN]');
    const token = logged.split(' ').at(-1) as string;

    const stored = await User.findOne().select(
      '+passwordResetTokenHash +passwordResetExpiresAt'
    );
    expect(stored?.passwordResetTokenHash).toBe(hashPasswordResetToken(token));
    expect(stored?.passwordResetTokenHash).not.toBe(token);
    expect(stored?.passwordResetExpiresAt?.getTime()).toBeGreaterThan(Date.now());
  });

  it('forgot sin usuario responde 200 genérico y no imprime token', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const response = await forgotPOST();
    const logged = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
    logSpy.mockRestore();

    expect(response.status).toBe(200);
    expect(logged).not.toContain('[RECUPERACIÓN]');
  });

  it('reset con token válido actualiza la contraseña y destruye la sesión', async () => {
    const userId = await createUser();
    cookieJar.set(AUTH_COOKIE_NAME, signSessionToken({ sub: userId }));
    const token = await requestToken();

    const response = await resetPOST(
      jsonRequest(`${API_URL}/api/auth/reset`, {
        token,
        newPassword: NEW_PASSWORD,
      })
    );

    expect(response.status).toBe(200);
    expect(cookieJar.has(AUTH_COOKIE_NAME)).toBe(false);

    const withNew = await loginPOST(
      jsonRequest(`${API_URL}/api/auth/login`, {
        email: 'reset@example.com',
        password: NEW_PASSWORD,
      })
    );
    expect(withNew.status).toBe(200);

    const withOld = await loginPOST(
      jsonRequest(`${API_URL}/api/auth/login`, {
        email: 'reset@example.com',
        password: CURRENT_PASSWORD,
      })
    );
    expect(withOld.status).toBe(401);
  });

  it('rechaza el mismo token dos veces (un solo uso)', async () => {
    await createUser();
    const token = await requestToken();

    const first = await resetPOST(
      jsonRequest(`${API_URL}/api/auth/reset`, {
        token,
        newPassword: NEW_PASSWORD,
      })
    );
    expect(first.status).toBe(200);

    const second = await resetPOST(
      jsonRequest(`${API_URL}/api/auth/reset`, {
        token,
        newPassword: 'otraClave789',
      })
    );

    expect(second.status).toBe(400);
    const body = await bodyOf(second);
    expect(String(body.error)).toContain('inválido o expiró');
  });

  it('rechaza un token expirado', async () => {
    const userId = await createUser();
    const { token, tokenHash, expiresAt } = createPasswordResetToken(userId, -10);

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: expiresAt,
        },
      }
    );

    const response = await resetPOST(
      jsonRequest(`${API_URL}/api/auth/reset`, {
        token,
        newPassword: NEW_PASSWORD,
      })
    );

    expect(response.status).toBe(400);
  });

  it('rechaza un token forjado o inválido', async () => {
    await createUser();
    await requestToken();

    const response = await resetPOST(
      jsonRequest(`${API_URL}/api/auth/reset`, {
        token: 'token.falso.inventado',
        newPassword: NEW_PASSWORD,
      })
    );

    expect(response.status).toBe(400);
  });

  it('rechaza un token de sesión usado como token de reset (purpose distinto)', async () => {
    const userId = await createUser();
    await requestToken();

    const response = await resetPOST(
      jsonRequest(`${API_URL}/api/auth/reset`, {
        token: signSessionToken({ sub: userId }),
        newPassword: NEW_PASSWORD,
      })
    );

    expect(response.status).toBe(400);
  });

  it('rechaza contraseñas nuevas de menos de 8 caracteres', async () => {
    await createUser();
    const token = await requestToken();

    const response = await resetPOST(
      jsonRequest(`${API_URL}/api/auth/reset`, { token, newPassword: 'corta' })
    );

    expect(response.status).toBe(400);
    const body = await bodyOf(response);
    expect(String(body.error)).toContain('8 caracteres');
  });
});
