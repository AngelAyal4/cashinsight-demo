// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoalCreateModal } from '@/components/goals/goal-create-modal';

describe('GoalCreateModal', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('abre con título y role dialog', () => {
    render(<GoalCreateModal onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Registrar nueva meta')).toBeInTheDocument();
  });

  it('submit exitoso: POST a /api/goals y onCreated llamado', async () => {
    const onCreated = vi.fn();
    const user = userEvent.setup();

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ _id: 'new-goal-id' }),
    });

    render(<GoalCreateModal onClose={vi.fn()} onCreated={onCreated} />);

    const nameInput = screen.getByPlaceholderText('Ej. Ahorrar para un viaje');
    await user.clear(nameInput);
    await user.type(nameInput, 'Meta test');

    const moneyInput = screen.getAllByRole('textbox')[1];
    await user.type(moneyInput, '10000');

    await user.click(screen.getByRole('button', { name: 'Crear meta' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/goals',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it('error del servidor: muestra role alert con mensaje', async () => {
    const user = userEvent.setup();

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Monto inválido' }),
    });

    render(<GoalCreateModal onClose={vi.fn()} onCreated={vi.fn()} />);

    const nameInput = screen.getByPlaceholderText('Ej. Ahorrar para un viaje');
    await user.clear(nameInput);
    await user.type(nameInput, 'Meta test');

    const moneyInput = screen.getAllByRole('textbox')[1];
    await user.type(moneyInput, '10000');

    await user.click(screen.getByRole('button', { name: 'Crear meta' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain('Monto inválido');
  });
});
