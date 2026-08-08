import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  SESSION_DURATION_SECONDS,
  signSessionToken,
  verifySessionToken,
} from './session';

const TEST_SECRET = 'test-secret-que-no-debe-usarse-en-produccion';

describe('session (JWT)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('firma un token con el sub correcto', () => {
    const token = signSessionToken({ sub: 'abc123' });

    expect(token.split('.')).toHaveLength(3);
    expect(verifySessionToken(token)).toEqual({ sub: 'abc123' });
  });

  it('la sesión dura 7 días', () => {
    expect(SESSION_DURATION_SECONDS).toBe(60 * 60 * 24 * 7);
  });

  it('rechaza un token firmado con otro secreto', () => {
    const token = jwt.sign({ sub: 'abc123' }, 'secreto-ajeno', {
      algorithm: 'HS256',
      expiresIn: '7d',
    });

    expect(verifySessionToken(token)).toBeNull();
  });

  it('rechaza un token manipulado', () => {
    const valid = signSessionToken({ sub: 'abc123' });
    const tampered = `${valid.slice(0, -1)}X`;

    expect(verifySessionToken(tampered)).toBeNull();
  });

  it('rechaza un token expirado', () => {
    const expired = jwt.sign({ sub: 'abc123' }, TEST_SECRET, {
      algorithm: 'HS256',
      expiresIn: -1,
    });

    expect(verifySessionToken(expired)).toBeNull();
  });

  it('rechaza un payload sin sub de tipo string', () => {
    const token = jwt.sign({ sub: 12345 }, TEST_SECRET, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });

    expect(verifySessionToken(token)).toBeNull();
  });

  it('devuelve null si JWT_SECRET no está definido', () => {
    delete process.env.JWT_SECRET;

    expect(verifySessionToken('cualquier-token')).toBeNull();
  });

  it('lanza un error descriptivo al firmar sin JWT_SECRET', () => {
    delete process.env.JWT_SECRET;

    expect(() => signSessionToken({ sub: 'abc123' })).toThrow(
      'JWT_SECRET'
    );
  });

  it('rechaza tokens con algoritmo distinto al permitido', () => {
    const token = jwt.sign({ sub: 'abc123' }, TEST_SECRET, {
      algorithm: 'none',
    }) as string;

    expect(verifySessionToken(token)).toBeNull();
  });
});