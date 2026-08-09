// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BudgetCard, BudgetProgressBar } from '@/components/budgets/budget-card';
import type { BudgetProgress } from '@/types';

function makeBudget(overrides: Partial<BudgetProgress> = {}): BudgetProgress {
  return {
    _id: '64b8f0000000000000000001',
    amount: 50000,
    period: 'monthly',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-31'),
    usedAmount: 25000,
    usagePercent: 50,
    status: 'sano',
    category: {
      _id: '64b8f0000000000000000002',
      name: 'Compras',
      type: 'expense',
      color: '#a3e635',
      icon: 'shoppingBag',
      behavior: 'variable',
    },
    ...overrides,
  };
}

describe('BudgetProgressBar', () => {
  it('renderiza sin crash con datos válidos', () => {
    const budget = makeBudget();
    const { container } = render(<BudgetProgressBar budget={budget} />);
    const bar = container.querySelector('.tremor-ProgressBar-progressBar');
    expect(bar).not.toBeNull();
    expect(bar).toHaveStyle({ width: '50%' });
  });

  it('trunca el valor a 100 cuando usagePercent > 100', () => {
    const budget = makeBudget({ usagePercent: 137, usedAmount: 68500 });
    const { container } = render(<BudgetProgressBar budget={budget} />);
    const bar = container.querySelector('.tremor-ProgressBar-progressBar');
    expect(bar).not.toBeNull();
    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('aplica color emerald para estado sano', () => {
    const budget = makeBudget({ status: 'sano', usagePercent: 50 });
    const { container } = render(<BudgetProgressBar budget={budget} />);
    expect(container.querySelector('.bg-emerald-500')).not.toBeNull();
  });

  it('aplica color amber para estado advertencia', () => {
    const budget = makeBudget({ status: 'advertencia', usagePercent: 85 });
    const { container } = render(<BudgetProgressBar budget={budget} />);
    expect(container.querySelector('.bg-amber-500')).not.toBeNull();
  });

  it('aplica color rose para estado excedido', () => {
    const budget = makeBudget({ status: 'excedido', usagePercent: 110 });
    const { container } = render(<BudgetProgressBar budget={budget} />);
    expect(container.querySelector('.bg-rose-500')).not.toBeNull();
  });
});

describe('BudgetCard', () => {
  it('muestra chip "Sano" para estado sano', () => {
    const budget = makeBudget({ status: 'sano' });
    render(<BudgetCard budget={budget} currency="ARS" onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Sano')).toBeInTheDocument();
  });

  it('muestra chip "En alerta" para estado advertencia', () => {
    const budget = makeBudget({ status: 'advertencia', usagePercent: 85 });
    render(<BudgetCard budget={budget} currency="ARS" onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('En alerta')).toBeInTheDocument();
  });

  it('muestra chip "Excedido" para estado excedido', () => {
    const budget = makeBudget({ status: 'excedido', usagePercent: 110 });
    render(<BudgetCard budget={budget} currency="ARS" onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Excedido')).toBeInTheDocument();
  });

  it('muestra "Excedente" solo cuando status es excedido', () => {
    const budgetExcedido = makeBudget({
      status: 'excedido',
      usagePercent: 120,
      usedAmount: 60000,
    });
    render(
      <BudgetCard budget={budgetExcedido} currency="ARS" onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.getByText(/Excedente:/)).toBeInTheDocument();
  });

  it('no muestra "Excedente" cuando status es sano', () => {
    const budget = makeBudget({ status: 'sano' });
    render(<BudgetCard budget={budget} currency="ARS" onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByText(/Excedente:/)).not.toBeInTheDocument();
  });

  it('flujo de cancelar borrado: No no llama onDelete y vuelve a "Eliminar"', async () => {
    const onDelete = vi.fn();
    const budget = makeBudget();
    const user = userEvent.setup();
    render(
      <BudgetCard budget={budget} currency="ARS" onEdit={vi.fn()} onDelete={onDelete} />
    );

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText('¿Eliminar?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'No' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
  });

  it('flujo de confirmar borrado: Sí llama onDelete con el budget', async () => {
    const onDelete = vi.fn();
    const budget = makeBudget();
    const user = userEvent.setup();
    render(
      <BudgetCard budget={budget} currency="ARS" onEdit={vi.fn()} onDelete={onDelete} />
    );

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText('¿Eliminar?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sí' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(budget);
  });

  it('click en Editar llama onEdit con el budget', async () => {
    const onEdit = vi.fn();
    const budget = makeBudget();
    const user = userEvent.setup();
    render(
      <BudgetCard budget={budget} currency="ARS" onEdit={onEdit} onDelete={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(budget);
  });
});
