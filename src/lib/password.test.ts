import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password (bcryptjs)', () => {
  it('genera un hash distinto al texto plano', async () => {
    const hash = await hashPassword('mi-contraseña-super-secreta');

    expect(hash).not.toBe('mi-contraseña-super-secreta');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('usa un salt distinto por hash (mismo password, hashes distintos)', async () => {
    const hashA = await hashPassword('misma-clave');
    const hashB = await hashPassword('misma-clave');

    expect(hashA).not.toBe(hashB);
  });

  it('verifica una contraseña correcta', async () => {
    const hash = await hashPassword('correcta-123');
    const ok = await verifyPassword('correcta-123', hash);

    expect(ok).toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword('correcta-123');
    const ok = await verifyPassword('incorrecta', hash);

    expect(ok).toBe(false);
  });

  it('no expone la contraseña a partir del hash', async () => {
    const hash = await hashPassword('frase-de-prueba');
    const ok = await verifyPassword('frase-de-pru', hash);

    expect(ok).toBe(false);
  });
});