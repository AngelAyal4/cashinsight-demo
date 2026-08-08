import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { FinancialProfile } from '@/models/FinancialProfile';
import type { AvatarId } from '@/types';

const avatarValues: [AvatarId, ...AvatarId[]] = [
  'bruno',
  'mateo',
  'clara',
  'lucía',
  'ren',
  'max',
];

const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  monthlyIncome: z.number().positive().optional(),
  fixedExpenses: z.number().min(0).optional(),
  variableExpenses: z.number().min(0).optional(),
  emergencyFundMonths: z.number().int().min(1).max(24).optional(),
  baseCurrency: z.enum(['ARS', 'USD', 'EUR']).optional(),
  savingsCurrency: z.enum(['ARS', 'USD', 'EUR']).optional(),
  avatar: z.enum(avatarValues).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200).optional(),
});

export async function GET() {
  try {
    await connectDB();
    const profile = await FinancialProfile.findOne().select('+passwordHash +passwordSalt');

    if (!profile) {
      return NextResponse.json({ error: 'No hay perfil configurado' }, { status: 404 });
    }

    return NextResponse.json({
      ...profile.toObject(),
      passwordHash: undefined,
      passwordSalt: undefined,
      hasPassword: Boolean(profile.passwordHash),
    });
  } catch (error: unknown) {
    console.error('Error obteniendo perfil financiero:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener el perfil financiero' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'El perfil no es válido' },
        { status: 400 }
      );
    }

    await connectDB();
    const profile = await FinancialProfile.findOne().select('+passwordHash +passwordSalt');

    if (!profile) {
      return NextResponse.json(
        { error: 'Primero completá el onboarding' },
        { status: 404 }
      );
    }

    const current = parsed.data.currentPassword;
    const newPassword = parsed.data.newPassword;

    if (newPassword) {
      if (profile.passwordHash && profile.passwordSalt) {
        if (!current) {
          return NextResponse.json(
            { error: 'Ingresá tu contraseña actual' },
            { status: 400 }
          );
        }

        const matches = verifyPassword(current, profile.passwordSalt, profile.passwordHash);
        if (!matches) {
          return NextResponse.json(
            { error: 'La contraseña actual es incorrecta' },
            { status: 400 }
          );
        }
      }

      const { hash, salt } = hashPassword(newPassword);
      profile.passwordHash = hash;
      profile.passwordSalt = salt;
    }

    const updates = parsed.data;

    profile.set({
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.monthlyIncome !== undefined
        ? { monthlyIncome: updates.monthlyIncome }
        : {}),
      ...(updates.fixedExpenses !== undefined
        ? { fixedExpenses: updates.fixedExpenses }
        : {}),
      ...(updates.variableExpenses !== undefined
        ? { variableExpenses: updates.variableExpenses }
        : {}),
      ...(updates.emergencyFundMonths !== undefined
        ? { emergencyFundMonths: updates.emergencyFundMonths }
        : {}),
      ...(updates.baseCurrency !== undefined
        ? { baseCurrency: updates.baseCurrency }
        : {}),
      ...(updates.savingsCurrency !== undefined
        ? { savingsCurrency: updates.savingsCurrency }
        : {}),
      ...(updates.avatar !== undefined ? { avatar: updates.avatar } : {}),
    });
    const savedProfile = await profile.save();

    return NextResponse.json({
      ...savedProfile.toObject(),
      passwordHash: undefined,
      passwordSalt: undefined,
      hasPassword: Boolean(savedProfile.passwordHash),
    });
  } catch (error: unknown) {
    console.error('Error actualizando perfil financiero:', error);
    return NextResponse.json(
      { error: 'No se pudo actualizar el perfil financiero' },
      { status: 500 }
    );
  }
}