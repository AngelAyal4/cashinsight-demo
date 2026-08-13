import type { CoupleBalance, CoupleBalanceStatus, CoupleSplit, PaidBy } from '@/types';
import {
  DEFAULT_COUPLE_SPLIT,
  getCoupleSharePercent,
  getPartnerSharePercent,
} from '@/lib/couple-split';

export interface CoupleBalanceRow {
  type: 'expense' | 'settlement';
  paidBy: PaidBy;
  total: number;
}

const EMPTY_BALANCE: CoupleBalance = {
  paidByMe: 0,
  paidByPartner: 0,
  net: 0,
  status: 'saldado',
};

function round(value: number): number {
  return Number(value.toFixed(2));
}

function resolveStatus(net: number): CoupleBalanceStatus {
  if (net > 0) {
    return 'te-deben';
  }
  return net < 0 ? 'debes' : 'saldado';
}

/**
 * Balance de pareja del mes activo (informativo, sin deudas automáticas):
 * - Gasto `yo` suma a mi aporte, `pareja` al de mi pareja, `compartido` se
 *   divide según el split configurado (`compartido` default 50/50).
 * - Liquidación `yo` = "yo recibí" (suma al aporte de mi pareja, baja el neto);
 *   `pareja` = "mi pareja recibió" (suma a mi aporte, sube el neto).
 *
 * `net > 0` → tu pareja te debe; `net < 0` → le debés.
 */
export function computeCoupleBalance(
  rows: CoupleBalanceRow[],
  split: CoupleSplit = DEFAULT_COUPLE_SPLIT
): CoupleBalance {
  if (rows.length === 0) {
    return { ...EMPTY_BALANCE };
  }

  const myShare = getCoupleSharePercent(split) / 100;
  const partnerShare = getPartnerSharePercent(split) / 100;
  let paidByMe = 0;
  let paidByPartner = 0;

  for (const row of rows) {
    if (!Number.isFinite(row.total) || row.total <= 0) {
      continue;
    }

    if (row.type === 'settlement') {
      if (row.paidBy === 'yo') {
        paidByPartner += row.total;
      } else if (row.paidBy === 'pareja') {
        paidByMe += row.total;
      }
      continue;
    }

    if (row.paidBy === 'yo') {
      paidByMe += row.total;
    } else if (row.paidBy === 'pareja') {
      paidByPartner += row.total;
    } else if (row.paidBy === 'compartido') {
      paidByMe += row.total * myShare;
      paidByPartner += row.total * partnerShare;
    }
  }

  const net = round(paidByMe - paidByPartner);

  return {
    paidByMe: round(paidByMe),
    paidByPartner: round(paidByPartner),
    net,
    status: resolveStatus(net),
  };
}

/** ¿Hay actividad de pareja para mostrar el bloque en el resumen? */
export function hasCoupleActivity(balance: CoupleBalance): boolean {
  return balance.paidByMe > 0 || balance.paidByPartner > 0;
}
