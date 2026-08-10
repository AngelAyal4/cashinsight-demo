import { describe, expect, it } from 'vitest';
import {
  computeCoupleBalance,
  hasCoupleActivity,
  type CoupleBalanceRow,
} from '@/lib/couple-balance';

function expenseRow(paidBy: CoupleBalanceRow['paidBy'], total: number): CoupleBalanceRow {
  return { type: 'expense', paidBy, total };
}

function settlementRow(paidBy: 'yo' | 'pareja', total: number): CoupleBalanceRow {
  return { type: 'settlement', paidBy, total };
}

describe('computeCoupleBalance', () => {
  it('sin movimientos devuelve el balance saldado en cero', () => {
    const balance = computeCoupleBalance([]);

    expect(balance).toEqual({
      paidByMe: 0,
      paidByPartner: 0,
      net: 0,
      status: 'saldado',
    });
  });

  it('suma los gastos propios y los de la pareja por separado', () => {
    const balance = computeCoupleBalance([
      expenseRow('yo', 10000),
      expenseRow('pareja', 6000),
    ]);

    expect(balance.paidByMe).toBe(10000);
    expect(balance.paidByPartner).toBe(6000);
    expect(balance.net).toBe(4000);
    expect(balance.status).toBe('te-deben');
  });

  it('divide los gastos compartidos 50/50', () => {
    const balance = computeCoupleBalance([expenseRow('compartido', 10000)]);

    expect(balance.paidByMe).toBe(5000);
    expect(balance.paidByPartner).toBe(5000);
    expect(balance.net).toBe(0);
    expect(balance.status).toBe('saldado');
  });

  it('combina propios, de la pareja y compartidos', () => {
    const balance = computeCoupleBalance([
      expenseRow('yo', 8000),
      expenseRow('pareja', 2000),
      expenseRow('compartido', 5000),
    ]);

    expect(balance.paidByMe).toBe(10500);
    expect(balance.paidByPartner).toBe(4500);
    expect(balance.net).toBe(6000);
    expect(balance.status).toBe('te-deben');
  });

  it('marca "debes" cuando la pareja puso más', () => {
    const balance = computeCoupleBalance([
      expenseRow('yo', 1000),
      expenseRow('pareja', 4000),
    ]);

    expect(balance.net).toBe(-3000);
    expect(balance.status).toBe('debes');
  });

  it('una liquidación "yo recibí" reduce el neto a favor mío', () => {
    const balance = computeCoupleBalance([
      expenseRow('yo', 10000),
      expenseRow('pareja', 6000),
      settlementRow('yo', 4000),
    ]);

    expect(balance.net).toBe(0);
    expect(balance.status).toBe('saldado');
  });

  it('una liquidación "mi pareja recibió" sube el neto', () => {
    const balance = computeCoupleBalance([
      expenseRow('pareja', 5000),
      settlementRow('pareja', 5000),
    ]);

    expect(balance.net).toBe(0);
    expect(balance.status).toBe('saldado');
  });

  it('admite liquidaciones parciales dejando el saldo restante', () => {
    const balance = computeCoupleBalance([
      expenseRow('yo', 10000),
      settlementRow('yo', 3000),
    ]);

    expect(balance.net).toBe(7000);
    expect(balance.status).toBe('te-deben');
  });

  it('redondea a dos decimales los montos compartidos impares', () => {
    const balance = computeCoupleBalance([expenseRow('compartido', 3333.33)]);

    expect(balance.paidByMe).toBeCloseTo(1666.665, 2);
    expect(balance.paidByMe).toBe(balance.paidByPartner);
    expect(balance.net).toBe(0);
    expect(balance.status).toBe('saldado');
  });

  it('ignora montos no positivos o inválidos', () => {
    const balance = computeCoupleBalance([
      expenseRow('yo', 0),
      expenseRow('pareja', -500),
      expenseRow('yo', Number.NaN),
      expenseRow('yo', 1000),
    ]);

    expect(balance.paidByMe).toBe(1000);
    expect(balance.paidByPartner).toBe(0);
    expect(balance.net).toBe(1000);
  });
});

describe('hasCoupleActivity', () => {
  it('es falso cuando nadie puso plata', () => {
    expect(hasCoupleActivity(computeCoupleBalance([]))).toBe(false);
  });

  it('es verdadero aunque el balance esté saldado con aportes', () => {
    const balance = computeCoupleBalance([
      expenseRow('yo', 5000),
      expenseRow('pareja', 5000),
    ]);

    expect(balance.status).toBe('saldado');
    expect(hasCoupleActivity(balance)).toBe(true);
  });
});
