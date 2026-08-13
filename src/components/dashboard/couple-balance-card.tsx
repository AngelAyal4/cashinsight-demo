'use client';

import { formatCurrency } from '@/lib/format';
import { formatCoupleSplit } from '@/lib/couple-split';
import type { CoupleBalance, CoupleSplit, CurrencyCode } from '@/types';

interface CoupleBalanceCardProps {
  balance: CoupleBalance;
  currency: CurrencyCode;
  onSettle: () => void;
  /** Configuración de reparto para gastos compartidos (default 50/50). */
  coupleSplit?: CoupleSplit;
}

function buildMessage(balance: CoupleBalance, currency: CurrencyCode): string {
  const amount = formatCurrency(Math.abs(balance.net), currency);

  if (balance.status === 'te-deben') {
    return `Tu pareja te debe ${amount}`;
  }

  return balance.status === 'debes' ? `Le debés ${amount}` : 'Están saldados';
}

export function CoupleBalanceCard({
  balance,
  currency,
  onSettle,
  coupleSplit,
}: CoupleBalanceCardProps) {
  const settled = balance.status === 'saldado';

  return (
    <section aria-label="Balance de pareja" className="card-brutal p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink/60">
          Balance de pareja
        </h2>
        {settled ? null : (
          <button type="button" onClick={onSettle} className="btn-brutal btn-brutal-xs">
            Liquidar
          </button>
        )}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink/60">
            Pusiste vos
          </p>
          <p className="mt-1 text-2xl font-extrabold text-ink">
            {formatCurrency(balance.paidByMe, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink/60">
            Puso tu pareja
          </p>
          <p className="mt-1 text-2xl font-extrabold text-ink">
            {formatCurrency(balance.paidByPartner, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink/60">
            Neto del mes
          </p>
          <p
            className={`mt-1 text-2xl font-extrabold ${
              settled
                ? 'text-ink'
                : balance.status === 'te-deben'
                  ? 'text-emerald-600'
                  : 'text-rose-700'
            }`}
          >
            {buildMessage(balance, currency)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs font-medium text-ink/70">
        Los gastos compartidos se dividen {formatCoupleSplit(coupleSplit ?? '50/50')}. Las
        liquidaciones no cuentan como ingreso ni gasto: solo saldan el balance.
        Si el monto no es exacto, el balance queda con el saldo restante.
      </p>
    </section>
  );
}
