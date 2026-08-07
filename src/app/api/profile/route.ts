import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { FinancialProfile } from '@/models/FinancialProfile';

const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  monthlyIncome: z.number().positive().optional(),
  fixedExpenses: z.number().min(0).optional(),
  variableExpenses: z.number().min(0).optional(),
  emergencyFundMonths: z.number().int().min(1).max(24).optional(),
  baseCurrency: z.enum(['ARS', 'USD', 'EUR']).optional(),
  savingsCurrency: z.enum(['ARS', 'USD', 'EUR']).optional(),
  uiColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export async function GET() {
  try {
    await connectDB();
    const profile = await FinancialProfile.findOne();

    return NextResponse.json(profile);
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
    const profile = await FinancialProfile.findOneAndUpdate({}, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Primero completá el onboarding' },
        { status: 404 }
      );
    }

    return NextResponse.json(profile);
  } catch (error: unknown) {
    console.error('Error actualizando perfil financiero:', error);
    return NextResponse.json(
      { error: 'No se pudo actualizar el perfil financiero' },
      { status: 500 }
    );
  }
}
