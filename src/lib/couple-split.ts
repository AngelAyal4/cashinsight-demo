import type { CoupleSplit } from '@/types';

export const COUPLE_SPLITS: CoupleSplit[] = [
  '90/10',
  '80/20',
  '70/30',
  '60/40',
  '50/50',
  '40/60',
  '30/70',
  '20/80',
  '10/90',
];

export const DEFAULT_COUPLE_SPLIT: CoupleSplit = '50/50';

/** Porcentaje que corresponde a "yo" en un gasto compartido (0-100). */
export function getCoupleSharePercent(split: CoupleSplit): number {
  const [share] = split.split('/');
  return Number(share);
}

/** Porcentaje que corresponde a la pareja en un gasto compartido (0-100). */
export function getPartnerSharePercent(split: CoupleSplit): number {
  return 100 - getCoupleSharePercent(split);
}

/** Formatea el split para mostrar en la UI (ej: "90/10"). */
export function formatCoupleSplit(split: CoupleSplit): string {
  return split;
}
