// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NOTIFICATIONS_ENABLED_KEY,
  getPermission,
  isEnabled,
  isSupported,
  requestNotificationPermission,
  setEnabled,
  showNotification,
} from '@/lib/notifications';

interface NotificationStub {
  permission: string;
  requestPermission: () => Promise<string>;
}

const showNotificationSpy = vi.fn(async () => undefined);

function stubNotification(permission: string, requestResult = permission): void {
  const stub: NotificationStub = {
    permission,
    requestPermission: vi.fn(async () => requestResult),
  };

  vi.stubGlobal('Notification', stub);
}

function stubServiceWorker(ready: Promise<unknown>): void {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready },
    configurable: true,
    writable: true,
  });
}

function removeServiceWorker(): void {
  Reflect.deleteProperty(navigator, 'serviceWorker');
}

beforeEach(() => {
  showNotificationSpy.mockClear();
  window.localStorage.clear();
  stubNotification('granted');
  stubServiceWorker(
    Promise.resolve({ showNotification: showNotificationSpy })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  removeServiceWorker();
});

describe('isSupported', () => {
  it('es true con Service Worker y Notification disponibles', () => {
    expect(isSupported()).toBe(true);
  });

  it('es false sin Service Worker', () => {
    removeServiceWorker();
    expect(isSupported()).toBe(false);
  });
});

describe('getPermission', () => {
  it('devuelve el permiso actual del navegador', () => {
    stubNotification('denied');
    expect(getPermission()).toBe('denied');
  });

  it('devuelve null si el navegador no soporta notificaciones', () => {
    removeServiceWorker();
    expect(getPermission()).toBeNull();
  });
});

describe('preferencia de la app', () => {
  it('arranca desactivada y se puede activar', () => {
    expect(isEnabled()).toBe(false);

    setEnabled(true);

    expect(window.localStorage.getItem(NOTIFICATIONS_ENABLED_KEY)).toBe('true');
    expect(isEnabled()).toBe(true);
  });

  it('se puede desactivar sin tocar el permiso del navegador', () => {
    setEnabled(true);
    setEnabled(false);

    expect(isEnabled()).toBe(false);
    expect(getPermission()).toBe('granted');
  });
});

describe('requestNotificationPermission', () => {
  it('pide el permiso y devuelve el resultado', async () => {
    stubNotification('default', 'granted');

    await expect(requestNotificationPermission()).resolves.toBe('granted');
  });

  it('devuelve null si no hay soporte', async () => {
    removeServiceWorker();

    await expect(requestNotificationPermission()).resolves.toBeNull();
  });
});

describe('showNotification', () => {
  const payload = {
    title: 'Superaste el límite de Ocio',
    body: 'Revisá tus gastos.',
    url: '/control',
    tag: 'limit:1',
  };

  it('muestra la notificación con icono, tag y url en data', async () => {
    setEnabled(true);

    await expect(showNotification(payload)).resolves.toBe(true);
    expect(showNotificationSpy).toHaveBeenCalledWith(payload.title, {
      body: payload.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'limit:1',
      data: { url: '/control' },
    });
  });

  it('no muestra nada si la preferencia está desactivada', async () => {
    await expect(showNotification(payload)).resolves.toBe(false);
    expect(showNotificationSpy).not.toHaveBeenCalled();
  });

  it('no muestra nada sin permiso concedido', async () => {
    setEnabled(true);
    stubNotification('default');

    await expect(showNotification(payload)).resolves.toBe(false);
    expect(showNotificationSpy).not.toHaveBeenCalled();
  });

  it('no lanza si el Service Worker falla', async () => {
    setEnabled(true);
    stubServiceWorker(Promise.reject(new Error('sin service worker')));

    await expect(showNotification(payload)).resolves.toBe(false);
  });
});
