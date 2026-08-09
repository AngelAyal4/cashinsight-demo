export const NOTIFICATIONS_ENABLED_KEY = 'cashinsight-notifications-enabled';

export type NotificationPermissionState = 'default' | 'granted' | 'denied';

export interface NotificationPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/** El navegador soporta Service Worker + Notification API. */
export function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window
  );
}

export function getPermission(): NotificationPermissionState | null {
  if (!isSupported()) {
    return null;
  }

  return window.Notification.permission as NotificationPermissionState;
}

/** Opt-in de la app: el permiso del navegador no se puede revocar desde JS. */
export function isEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));
  } catch {
    // La preferencia es opcional: sin storage, la sesión sigue funcionando.
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState | null> {
  if (!isSupported()) {
    return null;
  }

  try {
    const permission = await window.Notification.requestPermission();
    return permission as NotificationPermissionState;
  } catch {
    return null;
  }
}

/**
 * Muestra una notificación local a través del Service Worker registrado.
 * Nunca lanza: si algo falla, la app sigue su flujo normal.
 */
export async function showNotification({
  title,
  body,
  url,
  tag,
}: NotificationPayload): Promise<boolean> {
  if (!isSupported() || getPermission() !== 'granted' || !isEnabled()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag,
      data: { url },
    });

    return true;
  } catch {
    return false;
  }
}
