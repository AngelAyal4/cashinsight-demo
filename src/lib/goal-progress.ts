import { SavingsGoal, ISavingsGoalDocument } from '@/models/SavingsGoal';
import { Transaction } from '@/models/Transaction';
import type { GoalProgress } from '@/types';

interface ContributionTotal {
  _id: string;
  total: number;
}

function serializeGoal(
  goal: ISavingsGoalDocument,
  currentAmount: number
): GoalProgress {
  const progressPercentage = Math.min(
    100,
    Number(((currentAmount / goal.targetAmount) * 100).toFixed(2))
  );

  return {
    _id: String(goal._id),
    name: goal.name,
    goalType: goal.goalType,
    targetAmount: goal.targetAmount,
    currency: goal.currency,
    deadline: goal.deadline,
    priority: goal.priority,
    isEmergency: goal.isEmergency,
    plannedMonthlyAmount: goal.plannedMonthlyAmount,
    active: goal.active,
    currentAmount,
    remainingAmount: Math.max(0, goal.targetAmount - currentAmount),
    progressPercentage,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

export async function getGoalsWithProgress(): Promise<GoalProgress[]> {
  const goals = await SavingsGoal.find({ active: true }).sort({
    isEmergency: -1,
    priority: 1,
  });
  const goalIds = goals.map((goal) => goal._id);
  const [contributions, withdrawals] = await Promise.all([
    Transaction.aggregate<ContributionTotal>([
      { $match: { type: 'saving', goal: { $in: goalIds } } },
      { $group: { _id: '$goal', total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate<ContributionTotal>([
      { $match: { type: 'withdrawal', goal: { $in: goalIds } } },
      { $group: { _id: '$goal', total: { $sum: '$amount' } } },
    ]),
  ]);
  const contributionMap = new Map(
    contributions.map((contribution) => [String(contribution._id), contribution.total])
  );
  const withdrawalMap = new Map(
    withdrawals.map((withdrawal) => [String(withdrawal._id), withdrawal.total])
  );

  return goals.map((goal) => {
    const currentAmount =
      (contributionMap.get(String(goal._id)) ?? 0) -
      (withdrawalMap.get(String(goal._id)) ?? 0);

    return serializeGoal(goal, Math.max(0, currentAmount));
  });
}
