import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';
import { signSessionToken } from '@/lib/session';

const TEST_SECRET = 'test-secret-del-proxy';

function buildRequest(path: string, token?: string): NextRequest {
  const request = new NextRequest(`http://localhost:3000${path}`);

  if (token) {
    request.cookies.set('auth_token', token);
  }

  return request;
}

describe('proxy', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('permite las rutas públicas de auth sin sesión', () => {
    const response = proxy(buildRequest('/api/auth/login'));

    expect(response.status).toBe(200);
  });

  it('devuelve 401 JSON en APIs de datos sin sesión', async () => {
    const response = proxy(buildRequest('/api/transactions'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'No autenticado' });
  });

  it('deja pasar las APIs de datos con sesión válida', () => {
    const token = signSessionToken({ sub: 'usuario-1' });
    const response = proxy(buildRequest('/api/transactions', token));

    expect(response.status).toBe(200);
  });

  it('devuelve 401 con un token inválido en APIs de datos', () => {
    const response = proxy(buildRequest('/api/goals', 'token-manipulado'));

    expect(response.status).toBe(401);
  });

  it('redirige a /login las páginas protegidas sin sesión', () => {
    const response = proxy(buildRequest('/metas'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2Fmetas');
  });

  it('redirige a /login la raíz sin sesión', () => {
    const response = proxy(buildRequest('/'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2F');
  });

  it('redirige a /login el onboarding sin sesión', () => {
    const response = proxy(buildRequest('/onboarding'));

    expect(response.status).toBe(307);
  });

  it('deja pasar las páginas protegidas con sesión', () => {
    const token = signSessionToken({ sub: 'usuario-1' });
    const response = proxy(buildRequest('/perfil', token));

    expect(response.status).toBe(200);
  });

  it('redirige a / si ya hay sesión y se visita /login', () => {
    const token = signSessionToken({ sub: 'usuario-1' });
    const response = proxy(buildRequest('/login', token));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('deja pasar /register sin sesión', () => {
    const response = proxy(buildRequest('/register'));

    expect(response.status).toBe(200);
  });

  it('redirige /register a / con sesión activa', () => {
    const token = signSessionToken({ sub: 'usuario-1' });
    const response = proxy(buildRequest('/register', token));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/');
  });
});