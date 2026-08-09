export const APP_TIMEZONE = 'America/Argentina/Buenos_Aires';

const WALL_CLOCK_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const MONTH_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function wallClockMillis(instant: number): number {
  const parts = WALL_CLOCK_FORMATTER.formatToParts(new Date(instant));
  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second')
  );
}

/**
 * Convierte una hora de "reloj de pared" (timezone de Argentina) a un
 * instante Date real, sin depender del timezone del servidor.
 */
export function toZonedDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  let instant = wall;

  for (let i = 0; i < 3; i += 1) {
    instant = wall - (wallClockMillis(instant) - instant);
  }

  return new Date(instant);
}

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, month };
}

export function isValidMonthKey(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  const { year, month } = parseMonthKey(value);
  return Number.isInteger(year) && year >= 1 && month >= 1 && month <= 12;
}

/** MonthKey (YYYY-MM) en el timezone de la app, con fecha inyectable. */
export function getMonthKey(now: Date = new Date()): string {
  return MONTH_KEY_FORMATTER.format(now).slice(0, 7);
}

/** Rango del mes: start inclusivo, end exclusivo (primer instante del mes siguiente). */
export function getMonthRange(monthKey: string): { start: Date; end: Date } {
  const { year, month } = parseMonthKey(monthKey);
  return {
    start: toZonedDate(year, month, 1),
    end: toZonedDate(year, month + 1, 1),
  };
}

export function getPreviousMonthKey(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  const previous = new Date(Date.UTC(year, month - 1, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Devuelve todos los monthKeys k tales que fromKey <= k < toKey
 * (usado para procesar también meses omitidos entre activeMonth y el actual).
 */
export function listMonthsBetween(fromKey: string, toKey: string): string[] {
  const months: string[] = [];
  let cursor = fromKey;

  while (cursor < toKey) {
    months.push(cursor);
    cursor = getNextMonthKey(cursor);
  }

  return months;
}

export function getNextMonthKey(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getDaysInMonth(monthKey: string): number {
  const { year, month } = parseMonthKey(monthKey);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Días que quedan del mes en curso (incluye hoy). 0 si el mes ya terminó. */
export function getDaysRemainingInMonth(now: Date = new Date()): number {
  const current = getMonthKey(now);
  const today = Number(
    MONTH_KEY_FORMATTER.format(now).slice(8, 10)
  );
  const day = Number.isNaN(today) ? 1 : today;

  return Math.max(0, getDaysInMonth(current) - day + 1);
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  timeZone: APP_TIMEZONE,
  month: 'long',
  year: 'numeric',
});

/** Etiqueta legible del mes, ej: "Agosto de 2026". */
export function getMonthLabel(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  const label = MONTH_LABEL_FORMATTER.format(toZonedDate(year, month, 15));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
