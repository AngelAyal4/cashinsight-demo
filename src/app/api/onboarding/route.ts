import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { calculateFinancialPlan } from '@/lib/financial-plan';
import { FinancialProfile } from '@/models/FinancialProfile';
import { SavingsGoal } from '@/models/SavingsGoal';

const onboardingGoalSchema = z.object({
  name: z.string().trim().min(1, 'El nombre de la meta es obligatorio').max(100),
  goalType: z.enum(['car', 'retirement', 'travel', 'custom']),
  targetAmount: z.number().positive('El monto objetivo debe ser mayor a cero'),
  currency: z.enum(['ARS', 'USD', 'EUR']).optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});

const onboardingSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(80),
  monthlyIncome: z.number().positive('El ingreso debe ser mayor a cero'),
  incomeAccuracy: z.enum(['approximate', 'exact']),
  fixedExpenses: z.number().min(0, 'Los gastos fijos no pueden ser negativos'),
  variableExpenses: z
    .number()
    .min(0, 'Los gastos variables no pueden ser negativos'),
  emergencyFundMonths: z.number().int().min(1).max(24).default(3),
  baseCurrency: z.enum(['ARS', 'USD', 'EUR']),
  savingsCurrency: z.enum(['ARS', 'USD', 'EUR']),
  goals: z.array(onboardingGoalSchema).min(1, 'Agregá al menos una meta').max(10),
});

function getValidationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Los datos del onboarding no son válidos';
}

export async function POST(request: Request) {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    const body: unknown = await request.json();
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: getValidationMessage(parsed.error) },
        { status: 400 }
      );
    }

    await connectDB();

    const existingProfile = await FinancialProfile.findOne();
    if (existingProfile?.onboardingCompleted) {
      return NextResponse.json(
        { error: 'El onboarding ya fue completado' },
        { status: 409 }
      );
    }

    const data = parsed.data;
    const plan = calculateFinancialPlan(data);
    const emergencyTarget = Math.max(
      plan.monthlyExpenses * data.emergencyFundMonths,
      data.monthlyIncome * 0.25
    );
    const retirementTarget = data.monthlyIncome * 12;

    const profile = await FinancialProfile.findOneAndUpdate(
      {},
      {
        name: data.name,
        monthlyIncome: data.monthlyIncome,
        incomeAccuracy: data.incomeAccuracy,
        fixedExpenses: data.fixedExpenses,
        variableExpenses: data.variableExpenses,
        emergencyFundMonths: data.emergencyFundMonths,
        baseCurrency: data.baseCurrency,
        savingsCurrency: data.savingsCurrency,
        onboardingCompleted: true,
      },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    const goals = await SavingsGoal.create([
      {
        name: 'Fondo de emergencia',
        goalType: 'emergency',
        targetAmount: emergencyTarget,
        // It is calculated from daily expenses, so it stays in the base currency.
        currency: data.baseCurrency,
        priority: 'high',
        isEmergency: true,
        plannedMonthlyAmount: 0,
        active: true,
      },
      {
        name: 'Fondo de retiro',
        goalType: 'retirement',
        targetAmount: retirementTarget,
        currency: data.savingsCurrency,
        priority: 'high',
        isEmergency: false,
        plannedMonthlyAmount: 0,
        active: true,
      },
      ...data.goals.map((goal) => ({
        name: goal.name,
        goalType: goal.goalType,
        targetAmount: goal.targetAmount,
        currency: goal.currency ?? data.savingsCurrency,
        deadline: goal.deadline ? new Date(`${goal.deadline}T12:00:00`) : undefined,
        priority: goal.priority,
        isEmergency: false,
        plannedMonthlyAmount: 0,
        active: true,
      })),
    ]);

    return NextResponse.json(
      {
        profile,
        goals,
        plan,
        emergencyTarget,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error guardando onboarding:', error);
    return NextResponse.json(
      { error: 'No se pudo guardar la configuración inicial' },
      { status: 500 }
    );
  }
}
