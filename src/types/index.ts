// Types para CashinsightApp

export type CurrencyCode = 'ARS' | 'USD' | 'EUR';
export type TransactionType = 'income' | 'expense';
export type TransactionKind =
  | TransactionType
  | 'saving'
  | 'withdrawal'
  | 'settlement';
export type PaidBy = 'yo' | 'pareja' | 'compartido';
/** Origen del dinero de un ahorro: del ingreso del mes o externo (regalo, ahorro previo). */
export type SavingSource = 'income' | 'external';
export type CoupleBalanceStatus = 'te-deben' | 'debes' | 'saldado';
export type CoupleSplit =
  | '90/10'
  | '80/20'
  | '70/30'
  | '60/40'
  | '50/50'
  | '40/60'
  | '30/70'
  | '20/80'
  | '10/90';
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
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';
export type BudgetStatus = 'sano' | 'advertencia' | 'excedido';
export type CategoryBehavior = 'fijo' | 'variable';
export type MonthKey = string;

export interface ICategory {
  _id?: string;
  name: string;
  type: TransactionType;
  color: string;
  icon?: string;
  isDefault?: boolean;
  behavior?: CategoryBehavior;
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
  paidBy?: PaidBy | null;
  savingSource?: SavingSource | null;
  date: Date;
  notes?: string;
  isRecurring?: boolean;
  archived?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBudget {
  _id?: string;
  category: string | ICategory;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BudgetProgress extends Omit<IBudget, 'category'> {
  category: ICategory;
  usedAmount: number;
  usagePercent: number;
  status: BudgetStatus;
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

export interface CoupleBalance {
  paidByMe: number;
  paidByPartner: number;
  net: number;
  status: CoupleBalanceStatus;
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
  budgets: BudgetProgress[];
  recentTransactions: ITransaction[];
  incomeDistribution: ExpenseByCategory[];
  activeMonth: MonthKey;
  monthLabel: string;
  daysRemaining: number;
  totalFixed: number;
  totalVariable: number;
  availableToSpend: number;
  perDayRemaining: number;
  savingsRate: number;
  coupleBalance?: CoupleBalance;
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
  activeMonth?: MonthKey;
  coupleSplit?: CoupleSplit;
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

export interface SnapshotRange {
  start: string;
  end: string;
}

export interface SnapshotCategoryExpense {
  category: string;
  name: string;
  color: string;
  icon?: string;
  behavior: CategoryBehavior;
  total: number;
  percentage: number;
}

export interface SnapshotBudgetCompliance {
  budget: string;
  category: string;
  categoryName: string;
  color: string;
  amount: number;
  usedAmount: number;
  usagePercent: number;
  status: BudgetStatus;
}

export interface SnapshotGoal {
  goal: string;
  name: string;
  currency: CurrencyCode;
  amount: number;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
}

export interface SnapshotMetrics {
  topSpendingDay: { date: string; amount: number } | null;
  averageDailyExpense: number;
}

export interface IMonthlySnapshot {
  _id?: string;
  monthKey: MonthKey;
  currency: CurrencyCode;
  range: SnapshotRange;
  income: number;
  expenses: number;
  savings: number;
  balance: number;
  totalFixed: number;
  totalVariable: number;
  expensesByCategory: SnapshotCategoryExpense[];
  budgetCompliance: SnapshotBudgetCompliance[];
  goals: SnapshotGoal[];
  financialScore: number | null;
  scoreMessage: string | null;
  transactionsCount: number;
  metrics: SnapshotMetrics;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReportListItem {
  monthKey: MonthKey;
  currency: CurrencyCode;
  income: number;
  expenses: number;
  savings: number;
  balance: number;
  financialScore: number | null;
  scoreMessage: string | null;
  transactionsCount: number;
}
