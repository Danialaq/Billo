// Local-only storage: no account, nothing leaves the browser except the photo sent for reading.

const KEY = 'billo.v1';
let memory = null;

function blank() {
  return { bills: [], doneDates: [], saved: 0, quiz: null, plus: false, onboarded: false };
}

function load() {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(KEY);
    memory = raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch {
    memory = blank();
  }
  return memory;
}

function persist() {
  try { window.localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* storage unavailable: keep in memory */ }
}

export function state() {
  return load();
}

export function update(fn) {
  load();
  fn(memory);
  persist();
  return memory;
}

/** Bills worth showing: hides empty drafts left by a failed read or an unfilled manual entry. */
export function visibleBills() {
  return load().bills.filter((b) => Number(b.bill?.amount) > 0 || String(b.bill?.payee || '').trim());
}

export function getBill(id) {
  return load().bills.find((b) => b.id === id) || null;
}

export function newId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export function resetAll() {
  memory = blank();
  persist();
}
