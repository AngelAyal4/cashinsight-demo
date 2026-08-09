import { showNotification } from '@/lib/notifications';
import type { BudgetProgress, DashboardStats, GoalProgress } from '@/types';

export interface AppNotification {
  key: string;
  title: string;
  body: string;
  url: string;
}

/** Límites de Control pasados de rosca: un aviso por límite. */
export function evaluateBudgetAlerts(
  budgets: BudgetProgress[] | undefined
): AppNotification[] {
  if (!budgets) {
    return [];
  }

  return budgets
    .filter(
      (budget) =>
        budget.status === 'excedido' && budget.usedAmount > budget.amount
    )
    .map((budget) => ({
      key: `limit:${budget._id ?? budget.category._id ?? budget.category.name}`,
      title: `Superaste el límite de ${budget.category.name}`,
      body: 'Revisá tus gastos de la categoría en Control.',
      url: '/control',
    }));
}

/** El disponible del mes quedó en rojo: el presupuesto por día es negativo. */
export function evaluateDailyAlert(
  stats: DashboardStats | undefined
): AppNotification | null {
  if (!stats || stats.perDayRemaining >= 0) {
    return null;
  }

  return {
    key: 'daily',
    title: 'Te pasaste de tu presupuesto',
    body: 'Ya no te queda disponible para gastar en lo que resta del mes.',
    url: '/',
  };
}

/** Metas que llegaron al 100%. */
export function evaluateGoalAlerts(
  goals: GoalProgress[] | undefined
): AppNotification[] {
  if (!goals) {
    return [];
  }

  return goals
    .filter((goal) => goal.progressPercentage >= 100)
    .map((goal) => ({
      key: `goal:${goal._id ?? goal.name}`,
      title: `¡Meta cumplida: ${goal.name}!`,
      body: 'Llegaste al objetivo de ahorro. Entrá a Metas para definir el próximo.',
      url: '/metas',
    }));
}

/** Deduplicación por sesión: cada clave se notifica una sola vez. */
const notifiedKeys = new Set<string>();

/** Limpia la deduplicación (uso en tests). */
export function resetNotificationDedupe(): void {
  notifiedKeys.clear();
}

export async function dispatchAlerts(
  alerts: AppNotification[]
): Promise<string[]> {
  const dispatched: string[] = [];

  for (const alert of alerts) {
    if (notifiedKeys.has(alert.key)) {
      continue;
    }

    // Solo se deduplica cuando la notificación se mostró de verdad: si no había
    // permiso o flag activo, la próxima evaluación puede reintentarlo.
    const delivered = await showNotification({
      title: alert.title,
      body: alert.body,
      url: alert.url,
      tag: alert.key,
    });

    if (delivered) {
      notifiedKeys.add(alert.key);
      dispatched.push(alert.key);
    }
  }

  return dispatched;
}
