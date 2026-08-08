import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { FinancialProfile } from '@/models/FinancialProfile';
import { User } from '@/models/User';
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
});

const passwordChangeSchema = z.object({
  currentPassword: z
    .string({ message: 'La contraseña actual es obligatoria' })
    .min(1, 'La contraseña actual es obligatoria')
    .max(200),
  newPassword: z
    .string({ message: 'La nueva contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(200, 'La contraseña no puede superar los 200 caracteres'),
});

export async function GET() {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    await connectDB();
    const profile = await FinancialProfile.findOne();

    if (!profile) {
      return NextResponse.json({ error: 'No hay perfil configurado' }, { status: 404 });
    }

    return NextResponse.json(profile.toObject());
  } catch (error: unknown) {
    console.error('Error obteniendo perfil financiero:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener el perfil financiero' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    const body: unknown = await request.json();

    if (typeof body === 'object' && body !== null && 'newPassword' in body) {
      const parsedPassword = passwordChangeSchema.safeParse(body);

      if (!parsedPassword.success) {
        return NextResponse.json(
          { error: parsedPassword.error.issues[0]?.message ?? 'Los datos de contraseña no son válidos' },
          { status: 400 }
        );
      }

      await connectDB();
      const user = await User.findOne().select('+passwordHash');

      if (!user) {
        return unauthorizedResponse();
      }

      const passwordOk = await verifyPassword(
        parsedPassword.data.currentPassword,
        user.passwordHash
      );

      if (!passwordOk) {
        return NextResponse.json(
          { error: 'La contraseña actual es incorrecta' },
          { status: 400 }
        );
      }

      user.passwordHash = await hashPassword(parsedPassword.data.newPassword);
      await user.save();

      return NextResponse.json({ message: 'Contraseña actualizada' });
    }

    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'El perfil no es válido' },
        { status: 400 }
      );
    }

    await connectDB();
    const profile = await FinancialProfile.findOne();

    if (!profile) {
      return NextResponse.json(
        { error: 'Primero completá el onboarding' },
        { status: 404 }
      );
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

    return NextResponse.json(savedProfile.toObject());
  } catch (error: unknown) {
    console.error('Error actualizando perfil financiero:', error);
    return NextResponse.json(
      { error: 'No se pudo actualizar el perfil financiero' },
      { status: 500 }
    );
  }
}