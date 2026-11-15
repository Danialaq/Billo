// Money helpers. Amounts are kept in dollars as numbers and rounded to cents.

export function num(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function sum(list, pick = (x) => x) {
  return round2(list.reduce((acc, item) => acc + num(pick(item)), 0));
}

export function usd(n, { cents = true } = {}) {
  const value = round2(num(n));
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}
