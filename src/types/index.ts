// Types para CashinsightApp

export type CurrencyCode = 'ARS' | 'USD' | 'EUR';
export type TransactionType = 'income' | 'expense';
export type TransactionKind = TransactionType | 'saving' | 'withdrawal';
export type IncomeAccuracy = 'approximate' | 'exact';
export type AvatarId =
  | 'bruno'
  | 'mateo'
  | 'clara'
  | 'lucía'
  | 'ren'
  | 'max';
export type GoalPriority = 'high' | 'medium' | 'low';
export type GoalType =
  | 'emergency'
  | 'home'
  | 'car'
  | 'retirement'
  | 'travel'
  | 'custom';

export interface ICategory {
  _id?: string;
  name: string;
  type: TransactionType;
  color: string;
  icon?: string;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITransaction {
  _id?: string;
  amount: number;
  description: string;
  category?: string | ICategory;
  type: TransactionKind;
  goal?: string | ISavingsGoal;
  date: Date;
  notes?: string;
  isRecurring?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBudget {
  _id?: string;
  category: string | ICategory;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUser {
  _id: string;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MonthlyReport {
  month: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: {
    category: string;
    total: number;
    percentage: number;
  }[];
}

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyBalance: number;
  monthlySavings: number;
  plannedSavings: number;
  savingsCapacity: number;
  savingsPercentage: number;
  financialScore: number | null;
  scoreMessage: string | null;
  profile: IFinancialProfile | null;
  goals: GoalProgress[];
  recentTransactions: ITransaction[];
  incomeDistribution: ExpenseByCategory[];
}

export interface ExpenseByCategory {
  name: string;
  value: number;
  color: string;
}

export interface IFinancialProfile {
  _id?: string;
  name: string;
  monthlyIncome: number;
  incomeAccuracy: IncomeAccuracy;
  fixedExpenses: number;
  variableExpenses: number;
  emergencyFundMonths: number;
  baseCurrency: CurrencyCode;
  savingsCurrency: CurrencyCode;
  avatar?: AvatarId;
  onboardingCompleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISavingsGoal {
  _id?: string;
  name: string;
  goalType: GoalType;
  targetAmount: number;
  currency: CurrencyCode;
  deadline?: Date;
  priority: GoalPriority;
  isEmergency: boolean;
  plannedMonthlyAmount: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GoalProgress extends ISavingsGoal {
  currentAmount: number;
  remainingAmount: number;
  progressPercentage: number;
}
