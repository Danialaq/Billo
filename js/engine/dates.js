// Date helpers. All dates are ISO strings (YYYY-MM-DD) in the user's local calendar.

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseISO(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toISO(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso, days) {
  const date = parseISO(iso);
  if (!date) return null;
  return toISO(new Date(date.getTime() + days * DAY_MS));
}

export function daysBetween(fromISO, toISOStr) {
  const a = parseISO(fromISO);
  const b = parseISO(toISOStr);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function todayISO(now = new Date()) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatDate(iso) {
  const date = parseISO(iso);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
