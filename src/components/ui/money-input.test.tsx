// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MoneyInput } from '@/components/ui/money-input';

describe('MoneyInput', () => {
  it('convierte coma a punto al escribir', async () => {
    const onChange = vi.fn();
    render(<MoneyInput value={0} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, '12,5');
    expect(onChange).toHaveBeenLastCalledWith(12.5);
    expect(input).toHaveValue('12.5');
  });

  it('filtra letras', async () => {
    const onChange = vi.fn();
    render(<MoneyInput value={0} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'abc');
    expect(onChange).toHaveBeenCalledWith(0);
    expect(input).toHaveValue('');
  });

  it('maneja múltiples puntos conservando el primero', async () => {
    const onChange = vi.fn();
    render(<MoneyInput value={0} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, '1.2.3');
    expect(input).toHaveValue('12.3');
  });

  it('respeta el mínimo', async () => {
    const onChange = vi.fn();
    render(<MoneyInput value={0} onChange={onChange} min={10} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, '5');
    expect(onChange).toHaveBeenLastCalledWith(10);
  });

  it('respeta el máximo', async () => {
    const onChange = vi.fn();
    render(<MoneyInput value={0} onChange={onChange} max={100} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, '200');
    expect(onChange).toHaveBeenLastCalledWith(100);
  });
});
