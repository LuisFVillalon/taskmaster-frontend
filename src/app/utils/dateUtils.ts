/**
 * Date/time utilities that produce locale-safe strings without UTC conversion.
 *
 * Why locale-safe matters
 * ───────────────────────
 * JavaScript's `Date.toISOString()` converts to UTC before formatting. On a
 * US West Coast machine at 11 PM, `new Date().toISOString()` returns the *next
 * day* in UTC, causing due-date comparisons and cache keys to drift by one day.
 * These helpers read the local calendar fields directly to avoid that.
 */

/**
 * Format a Date as a local-timezone ISO 8601 datetime string.
 * Output: "YYYY-MM-DDTHH:mm:ss.SSS" (no Z / timezone offset suffix).
 *
 * @param date - The Date to format
 */
export const toLocalISOString = (date: Date): string => {
  const pad2  = (n: number) => String(n).padStart(2, '0');
  const pad3  = (n: number) => String(n).padStart(3, '0');
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.${pad3(date.getMilliseconds())}`
  );
};

/**
 * Format a Date or ISO string as a locale-safe YYYY-MM-DD date string.
 * Reads local calendar fields — never converts to UTC.
 *
 * @param d - A Date object or an ISO string (only the first 10 chars are used)
 */
export const toLocalDateStr = (d: string | Date): string => {
  if (typeof d === 'string') return d.slice(0, 10);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/**
 * Format a Date as a locale-safe HH:MM time string.
 * Reads local hour/minute fields — never converts to UTC.
 *
 * @param d - The Date to format
 */
export const toLocalTimeStr = (d: Date): string => {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/**
 * Format a start/end Date pair as a short range, e.g. "Aug 18–24" when both
 * fall in the same month, or "Aug 30 – Sep 5" when the range crosses months.
 *
 * @param start - The range's first day
 * @param end - The range's last day
 */
export const formatDateRange = (start: Date, end: Date): string => {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (sameMonth) return `${startLabel}–${end.getDate()}`;
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startLabel} – ${endLabel}`;
};

/**
 * Parse a "YYYY-MM-DD" date-only string as a local-timezone Date at
 * midnight. Unlike `new Date(iso)`, this never shifts a day when the local
 * timezone is behind UTC — the inverse of `toLocalDateStr`.
 *
 * @param iso - A "YYYY-MM-DD" string
 */
export const parseLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Format a Date as a long-form date, e.g. "January 1, 2026".
 *
 * @param date - The Date to format
 */
export const formatLongDate = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/** True for Monday–Friday, given a JS `Date#getDay()` value (0=Sun..6=Sat). */
export const isWeekday = (dayOfWeek: number): boolean => dayOfWeek >= 1 && dayOfWeek <= 5;

/** True for Saturday/Sunday, given a JS `Date#getDay()` value (0=Sun..6=Sat). */
export const isWeekend = (dayOfWeek: number): boolean => dayOfWeek === 0 || dayOfWeek === 6;

/**
 * Format an ISO timestamp for "last updated" displays: a bare time when it
 * falls on today, otherwise a short date (with year only if not this year).
 *
 * @param iso - An ISO 8601 timestamp string
 */
export const formatUpdatedDate = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
};

/** Formats a duration in seconds as a short "1h 20m" / "5m" / "<1m" label. */
export const formatDurationShort = (totalSeconds: number): string => {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return '<1m';
};
