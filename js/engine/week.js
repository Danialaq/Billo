// "Money week": what happens on each of the next days, across every saved bill.
// Pure functions so they can be tested and reused for the calendar export.

import { addDays, todayISO } from './dates.js';
import { normalizeBill } from './steps.js';
import { money } from './money.js';

/**
 * @returns {{date: string, items: {kind: 'pay'|'task'|'due'|'done', title: string, payee: string, amount: number, recordId: string}[]}[]}
 */
export function moneyWeek(records, today = todayISO(), days = 14) {
  const out = Array.from({ length: days }, (_, i) => ({ date: addDays(today, i), items: [] }));
  const byDate = Object.fromEntries(out.map((d) => [d.date, d]));
  for (const r of records) {
    const bill = normalizeBill(r.bill);
    for (const st of r.steps || []) {
      if (st.done && st.doneAt && byDate[st.doneAt]) {
        byDate[st.doneAt].items.push({ kind: 'done', title: st.title, payee: bill.payee, amount: bill.amount, currency: bill.currency, recordId: r.id });
      } else if (!st.done) {
        // Overdue or undated steps belong to today.
        const day = !st.when || st.when < today ? today : st.when;
        if (byDate[day]) byDate[day].items.push({ kind: st.kind === 'pay' ? 'pay' : 'task', title: st.title, payee: bill.payee, amount: bill.amount, currency: bill.currency, recordId: r.id });
      }
    }
    if (!r.completedAt && bill.dueDate && byDate[bill.dueDate]) {
      byDate[bill.dueDate].items.push({ kind: 'due', title: `${bill.payee} due`, payee: bill.payee, amount: bill.amount, currency: bill.currency, recordId: r.id });
    }
  }
  const rank = { due: 0, pay: 1, task: 2, done: 3 };
  out.forEach((d) => d.items.sort((a, b) => rank[a.kind] - rank[b.kind]));
  return out;
}

/** Every future pay day and due date as calendar events (for one .ics download). */
export function calendarEvents(records, today = todayISO()) {
  const events = [];
  for (const r of records) {
    if (r.completedAt) continue;
    const bill = normalizeBill(r.bill);
    for (const st of r.steps || []) {
      if (st.done || !st.when || st.when <= today) continue;
      events.push({ date: st.when, label: st.kind === 'pay' ? `Pay ${bill.payee} — ${money(bill.amount, bill.currency)}` : `${st.title}`, detail: `${st.title}. Open Billo for the details.` });
    }
    if (bill.dueDate && bill.dueDate >= today) {
      events.push({ date: bill.dueDate, label: `${bill.payee} due — ${money(bill.amount, bill.currency)}`, detail: 'Due date from your bill. Pay a couple of days earlier to be safe.' });
    }
  }
  const seen = new Set();
  return events
    .filter((e) => { const k = `${e.date}|${e.label}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.date.localeCompare(b.date));
}
