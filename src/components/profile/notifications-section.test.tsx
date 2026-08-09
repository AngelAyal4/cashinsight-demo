// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsSection } from '@/components/profile/notifications-section';
import {
  getPermission,
  isEnabled,
  isSupported,
  requestNotificationPermission,
  setEnabled,
} from '@/lib/notifications';

vi.mock('@/lib/notifications', () => ({
  isSupported: vi.fn(() => true),
  getPermission: vi.fn(() => 'default'),
  isEnabled: vi.fn(() => false),
  setEnabled: vi.fn(),
  requestNotificationPermission: vi.fn(async () => 'granted'),
}));

const isSupportedMock = vi.mocked(isSupported);
const getPermissionMock = vi.mocked(getPermission);
const isEnabledMock = vi.mocked(isEnabled);
const setEnabledMock = vi.mocked(setEnabled);
const requestPermissionMock = vi.mocked(requestNotificationPermission);

beforeEach(() => {
  vi.clearAllMocks();
  isSupportedMock.mockReturnValue(true);
  getPermissionMock.mockReturnValue('default');
  isEnabledMock.mockReturnValue(false);
  requestPermissionMock.mockImplementation(async () => {
    getPermissionMock.mockReturnValue('granted');
    return 'granted';
  });
  // El estado real vive en la lib: el mock refleja el cambio de preferencia.
  setEnabledMock.mockImplementation((enabled: boolean) => {
    isEnabledMock.mockReturnValue(enabled);
  });
});

describe('NotificationsSection', () => {
  it('avisa cuando el navegador no soporta notificaciones', () => {
    isSupportedMock.mockReturnValue(false);
    getPermissionMock.mockReturnValue(null);

    render(<NotificationsSection />);

    expect(
      screen.getByText(/no soporta notificaciones del sistema/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('explica cómo rehabilitar el permiso cuando está denegado', () => {
    getPermissionMock.mockReturnValue('denied');

    render(<NotificationsSection />);

    expect(screen.getByText(/candado de la barra/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /activar notificaciones/i })
    ).not.toBeInTheDocument();
  });

  it('permite activar y pide el permiso al navegador', async () => {
    const user = userEvent.setup();
    render(<NotificationsSection />);

    await user.click(
      screen.getByRole('button', { name: /activar notificaciones/i })
    );

    expect(requestPermissionMock).toHaveBeenCalledTimes(1);
    expect(setEnabledMock).toHaveBeenCalledWith(true);
    expect(await screen.findByText(/notificaciones activadas/i)).toBeInTheDocument();
  });

  it('no vuelve a pedir permiso si ya está concedido', async () => {
    const user = userEvent.setup();
    getPermissionMock.mockReturnValue('granted');

    render(<NotificationsSection />);

    await user.click(
      screen.getByRole('button', { name: /activar notificaciones/i })
    );

    expect(requestPermissionMock).not.toHaveBeenCalled();
    expect(setEnabledMock).toHaveBeenCalledWith(true);
  });

  it('permite desactivar los avisos manteniendo el permiso', async () => {
    const user = userEvent.setup();
    getPermissionMock.mockReturnValue('granted');
    isEnabledMock.mockReturnValue(true);

    render(<NotificationsSection />);

    expect(screen.getByText(/notificaciones activadas/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /desactivar/i }));

    expect(setEnabledMock).toHaveBeenCalledWith(false);
    expect(
      screen.getByRole('button', { name: /activar notificaciones/i })
    ).toBeInTheDocument();
  });
});
