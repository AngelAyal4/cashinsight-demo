export interface FinancialScoreInput {
  monthlyIncome: number;
  monthlyExpense: number;
  fixedExpenses: number;
  variableExpenses: number;
  plannedSavings: number;
  monthlySavings: number;
}

export type FinancialHealthLevel =
  | 'perfecto'
  | 'bien'
  | 'revisar'
  | 'cuidado'
  | 'alerta';

export interface FinancialHealth {
  level: FinancialHealthLevel;
  label: string;
  description: string;
  dotClass: string;
}

interface FinancialHealthInput {
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySavings: number;
  plannedSavings: number | null;
  fixedExpenses: number | null;
  variableExpenses: number | null;
}

export function computeFinancialHealth({
  monthlyIncome,
  monthlyExpense,
  monthlySavings,
  plannedSavings,
  fixedExpenses,
  variableExpenses,
}: FinancialHealthInput): FinancialHealth {
  if (monthlyIncome <= 0) {
    return {
      level: 'revisar',
      label: 'Pendiente',
      description: 'Cargá un ingreso para conocer tu salud financiera.',
      dotClass: 'bg-slate-400',
    };
  }

  const expenseRatio = monthlyExpense / monthlyIncome;
  const savingsAreLow = monthlySavings <= monthlyIncome * 0.1;
  const spendsAlmostAll = expenseRatio >= 0.9;
  const hasSavingsPlan = plannedSavings !== null && plannedSavings > 0;
  const meetsSavingsPlan = hasSavingsPlan && monthlySavings >= plannedSavings;
  const staysWithinPlan =
    fixedExpenses !== null &&
    variableExpenses !== null &&
    monthlyExpense <= fixedExpenses + variableExpenses;

  if (expenseRatio >= 1.2) {
    return {
      level: 'alerta',
      label: 'Alerta máxima',
      description: 'Tus gastos superan ampliamente el nivel recomendado.',
      dotClass: 'bg-rose-600',
    };
  }

  if (expenseRatio > 1) {
    return {
      level: 'cuidado',
      label: 'Ten cuidado!',
      description: 'Tus gastos superan levemente tus ingresos.',
      dotClass: 'bg-orange-400',
    };
  }

  if (meetsSavingsPlan && staysWithinPlan) {
    return {
      level: 'perfecto',
      label: 'Perfecto!',
      description: 'Tus gastos están bajo control y cumplís tus metas de ahorro.',
      dotClass: 'bg-emerald-500',
    };
  }

  if (savingsAreLow && spendsAlmostAll) {
    return {
      level: 'revisar',
      label: 'Revisá tus gastos',
      description: 'Tu presupuesto llega justo al cierre y el ahorro es reducido.',
      dotClass: 'bg-amber-400',
    };
  }

  if (monthlySavings > 0) {
    return {
      level: 'bien',
      label: 'Bien hecho',
      description: 'Tus gastos están controlados y realizás aportes a tus metas de ahorro.',
      dotClass: 'bg-lime-400',
    };
  }

  return {
    level: 'revisar',
    label: 'Revisá tus gastos',
    description: 'Reservá una parte de tus ingresos para fortalecer tu ahorro.',
    dotClass: 'bg-amber-400',
  };
}

/**
 * Score financiero 0-100: premia mantenerse dentro del presupuesto
 * (fijos + variables del perfil) y alcanzar el ahorro planificado.
 */
export function computeFinancialScore({
  monthlyIncome,
  monthlyExpense,
  fixedExpenses,
  variableExpenses,
  plannedSavings,
  monthlySavings,
}: FinancialScoreInput): number | null {
  if (monthlyIncome <= 0) {
    return null;
  }

  const overMonthly = Math.max(
    0,
    monthlyExpense - fixedExpenses - variableExpenses
  );
  const savingsShare =
    plannedSavings > 0
      ? Math.min(100, (monthlySavings / plannedSavings) * 100)
      : 100;

  return Math.round(
    Math.max(0, 100 - (overMonthly / monthlyIncome) * 100) * 0.7 +
      savingsShare * 0.3
  );
}

export function computeScoreMessage(score: number | null): string | null {
  return score !== null && score < 70
    ? 'Revisa tus gastos para poder alcanzar tus metas'
    : null;
}

/**
 * Disponible para gastar en el mes: ingresos − fijos del perfil − gastos
 * variables ya registrados.
 */
export function computeAvailableToSpend(
  monthlyIncome: number,
  fixedExpenses: number,
  variableExpensesSpent: number
): number {
  return monthlyIncome - fixedExpenses - variableExpensesSpent;
}

/** Cuánto se puede gastar por día: disponible sobre días restantes (incluye hoy). */
export function computePerDayRemaining(
  availableToSpend: number,
  daysRemaining: number
): number {
  if (daysRemaining <= 0) {
    return 0;
  }
  return availableToSpend / daysRemaining;
}

export function computeSavingsRate(
  monthlySavings: number,
  monthlyIncome: number
): number {
  if (monthlyIncome <= 0) {
    return 0;
  }
  return Number(((monthlySavings / monthlyIncome) * 100).toFixed(2));
}
