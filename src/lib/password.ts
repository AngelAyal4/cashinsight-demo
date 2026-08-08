import { hash, compare } from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashValue: string
): Promise<boolean> {
  return compare(password, hashValue);
}