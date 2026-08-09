import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dispatchAlerts,
  evaluateBudgetAlerts,
  evaluateDailyAlert,
  evaluateGoalAlerts,
  resetNotificationDedupe,
} from '@/lib/notification-triggers';
import { showNotification } from '@/lib/notifications';
import { makeBudgetProgress } from '@/test/factories';
import type { DashboardStats, GoalProgress } from '@/types';

vi.mock('@/lib/notifications', () => ({
  showNotification: vi.fn(async () => true),
}));

const showNotificationMock = vi.mocked(showNotification);

function makeGoal(overrides: Partial<GoalProgress> = {}): GoalProgress {
  return {
    _id: '64b8f0000000000000000030',
    name: 'Fondo de retiro',
    goalType: 'retirement',
    targetAmount: 100000,
    currency: 'ARS',
    priority: 'medium',
    isEmergency: false,
    plannedMonthlyAmount: 10000,
    active: true,
    currentAmount: 100000,
    remainingAmount: 0,
    progressPercentage: 100,
    ...overrides,
  };
}

function makeStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
  return {
    totalBalance: 0,
    monthlyIncome: 100000,
    monthlyExpense: 40000,
    monthlyBalance: 60000,
    monthlySavings: 0,
    plannedSavings: 0,
    savingsCapacity: 0,
    savingsPercentage: 0,
    financialScore: 80,
    scoreMessage: null,
    profile: null,
    goals: [],
    budgets: [],
    recentTransactions: [],
    incomeDistribution: [],
    activeMonth: '2026-07',
    monthLabel: 'Julio 2026',
    daysRemaining: 10,
    totalFixed: 0,
    totalVariable: 0,
    availableToSpend: 10000,
    perDayRemaining: 1000,
    savingsRate: 0,
    ...overrides,
  };
}

beforeEach(() => {
  resetNotificationDedupe();
  showNotificationMock.mockClear();
});

describe('evaluateBudgetAlerts', () => {
  it('avisa por cada límite excedido', () => {
    const alerts = evaluateBudgetAlerts([
      makeBudgetProgress({
        _id: 'b1',
        status: 'excedido',
        usedAmount: 60000,
        amount: 50000,
      }),
    ]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].key).toBe('limit:b1');
    expect(alerts[0].title).toContain('Compras');
    expect(alerts[0].url).toBe('/control');
  });

  it('no avisa por límites sanos o en alerta', () => {
    const alerts = evaluateBudgetAlerts([
      makeBudgetProgress({ _id: 'b1', status: 'sano' }),
      makeBudgetProgress({ _id: 'b2', status: 'advertencia', usedAmount: 45000 }),
    ]);

    expect(alerts).toEqual([]);
  });

  it('no avisa si el excedente no supera el límite', () => {
    const alerts = evaluateBudgetAlerts([
      makeBudgetProgress({ status: 'excedido', usedAmount: 50000, amount: 50000 }),
    ]);

    expect(alerts).toEqual([]);
  });

  it('tolera datos ausentes', () => {
    expect(evaluateBudgetAlerts(undefined)).toEqual([]);
  });
});

describe('evaluateDailyAlert', () => {
  it('avisa cuando el presupuesto diario queda en negativo', () => {
    const alert = evaluateDailyAlert(makeStats({ perDayRemaining: -250 }));

    expect(alert).not.toBeNull();
    expect(alert?.key).toBe('daily');
    expect(alert?.url).toBe('/');
  });

  it('no avisa con presupuesto diario disponible', () => {
    expect(evaluateDailyAlert(makeStats({ perDayRemaining: 0 }))).toBeNull();
    expect(evaluateDailyAlert(makeStats({ perDayRemaining: 500 }))).toBeNull();
    expect(evaluateDailyAlert(undefined)).toBeNull();
  });
});

describe('evaluateGoalAlerts', () => {
  it('avisa por metas al 100%', () => {
    const alerts = evaluateGoalAlerts([makeGoal({ _id: 'g1' })]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].key).toBe('goal:g1');
    expect(alerts[0].url).toBe('/metas');
  });

  it('no avisa por metas incompletas', () => {
    const alerts = evaluateGoalAlerts([makeGoal({ progressPercentage: 99.4 })]);

    expect(alerts).toEqual([]);
    expect(evaluateGoalAlerts(undefined)).toEqual([]);
  });
});

describe('dispatchAlerts', () => {
  const alert = {
    key: 'limit:b1',
    title: 'Superaste el límite de Compras',
    body: 'Revisá tus gastos de la categoría en Control.',
    url: '/control',
  };

  it('muestra la notificación con la url y el tag de la clave', async () => {
    const dispatched = await dispatchAlerts([alert]);

    expect(dispatched).toEqual(['limit:b1']);
    expect(showNotificationMock).toHaveBeenCalledTimes(1);
    expect(showNotificationMock).toHaveBeenCalledWith({
      title: alert.title,
      body: alert.body,
      url: '/control',
      tag: 'limit:b1',
    });
  });

  it('deduplica la misma clave dentro de la sesión', async () => {
    await dispatchAlerts([alert]);
    const second = await dispatchAlerts([alert]);

    expect(second).toEqual([]);
    expect(showNotificationMock).toHaveBeenCalledTimes(1);
  });

  it('notifica claves distintas', async () => {
    await dispatchAlerts([alert, { ...alert, key: 'daily', url: '/' }]);

    expect(showNotificationMock).toHaveBeenCalledTimes(2);
  });

  it('vuelve a notificar tras reiniciar la deduplicación', async () => {
    await dispatchAlerts([alert]);
    resetNotificationDedupe();
    await dispatchAlerts([alert]);

    expect(showNotificationMock).toHaveBeenCalledTimes(2);
  });

  it('no deduplica si la notificación no se mostró (sin permiso o flag)', async () => {
    showNotificationMock.mockResolvedValueOnce(false);
    await dispatchAlerts([alert]);

    showNotificationMock.mockResolvedValueOnce(true);
    const second = await dispatchAlerts([alert]);

    expect(second).toEqual(['limit:b1']);
    expect(showNotificationMock).toHaveBeenCalledTimes(2);
  });
});
