export interface FinancialPlanInput {
  monthlyIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
}

export interface FinancialPlan {
  monthlyExpenses: number;
  savingsCapacity: number;
  savingsPercentage: number;
}

export function calculateFinancialPlan({
  monthlyIncome,
  fixedExpenses,
  variableExpenses,
}: FinancialPlanInput): FinancialPlan {
  const monthlyExpenses = fixedExpenses + variableExpenses;
  const savingsCapacity = Math.max(0, monthlyIncome - monthlyExpenses);
  const savingsPercentage = monthlyIncome
    ? Number(((savingsCapacity / monthlyIncome) * 100).toFixed(2))
    : 0;

  return {
    monthlyExpenses,
    savingsCapacity,
    savingsPercentage,
  };
}
