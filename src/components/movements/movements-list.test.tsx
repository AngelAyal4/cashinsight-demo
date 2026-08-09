// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MovementsList } from '@/components/movements/movements-list';
import { makeTransaction } from '@/test/factories';
import type { ITransaction } from '@/types';

describe('MovementsList', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.startsWith('/api/transactions?') || urlStr === '/api/transactions') {
          return {
            ok: true,
            json: async () => [
              makeTransaction({
                _id: '1',
                amount: 5000,
                description: 'Supermercado',
                type: 'expense',
              }),
              makeTransaction({
                _id: '2',
                amount: 30000,
                description: 'Sueldo',
                type: 'income',
              }),
              makeTransaction({
                _id: '3',
                amount: 10000,
                description: 'Ahorro meta',
                type: 'saving',
              }),
            ] as ITransaction[],
          };
        }
        if (urlStr.includes('/api/transactions/')) {
          return { ok: true, json: async () => ({}) };
        }
        throw new Error(`Unexpected fetch: ${urlStr}`);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra transacciones con signos correctos (+/−/→)', async () => {
    render(
      <MovementsList currency="ARS" refreshKey={0} onEdit={vi.fn()} />
    );

    await screen.findByText('Supermercado');
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Sueldo')).toBeInTheDocument();
    expect(screen.getByText('Ahorro meta')).toBeInTheDocument();
  });

  it('click en Editar llama onEdit con la transacción', async () => {
    const onEdit = vi.fn();
    render(
      <MovementsList currency="ARS" refreshKey={0} onEdit={onEdit} />
    );

    await screen.findByText('Supermercado');
    const editButtons = screen.getAllByRole('button', { name: 'Editar' });
    await userEvent.click(editButtons[0]);

    expect(onEdit).toHaveBeenCalled();
    expect(onEdit.mock.calls[0][0]).toHaveProperty('description');
  });

  it('flujo de borrar: Cancelar cierra el diálogo sin eliminar', async () => {
    const user = userEvent.setup();
    render(
      <MovementsList currency="ARS" refreshKey={0} onEdit={vi.fn()} />
    );

    await screen.findByText('Supermercado');
    const deleteButtons = screen.getAllByRole('button', { name: 'Borrar' });
    await user.click(deleteButtons[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('flujo de borrar: "Sí, eliminar" ejecuta DELETE y remueve el item', async () => {
    const user = userEvent.setup();
    render(
      <MovementsList currency="ARS" refreshKey={0} onEdit={vi.fn()} />
    );

    await screen.findByText('Supermercado');
    const deleteButtons = screen.getAllByRole('button', { name: 'Borrar' });
    await user.click(deleteButtons[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

    await waitFor(() => {
      expect(screen.queryByText('Supermercado')).not.toBeInTheDocument();
    });
  });
});
