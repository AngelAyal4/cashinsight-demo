export interface FinancialScoreInput {
  monthlyIncome: number;
  monthlyExpense: number;
  fixedExpenses: number;
  variableExpenses: number;
  plannedSavings: number;
  monthlySavings: number;
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