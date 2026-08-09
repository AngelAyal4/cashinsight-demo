'use client';

import { useEffect } from 'react';
import {
  dispatchAlerts,
  evaluateBudgetAlerts,
  evaluateDailyAlert,
  evaluateGoalAlerts,
} from '@/lib/notification-triggers';
import type { BudgetProgress, DashboardStats, GoalProgress } from '@/types';

interface ThresholdSources {
  budgets?: BudgetProgress[];
  goals?: GoalProgress[];
  stats?: DashboardStats;
}

/**
 * Evalúa los umbrales cada vez que llegan datos nuevos y dispara las
 * notificaciones locales. La deduplicación por sesión vive en la lib de
 * triggers: re-renders y refetch no repiten el mismo aviso.
 */
export function useThresholdNotifications({
  budgets,
  goals,
  stats,
}: ThresholdSources): void {
  useEffect(() => {
    const dailyAlert = evaluateDailyAlert(stats);
    const alerts = [
      ...evaluateBudgetAlerts(budgets),
      ...(dailyAlert ? [dailyAlert] : []),
      ...evaluateGoalAlerts(goals),
    ];

    if (alerts.length === 0) {
      return;
    }

    void dispatchAlerts(alerts);
  }, [budgets, goals, stats]);
}
