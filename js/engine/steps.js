// Billo step engine. The AI only reads the bill; these rules decide what to do.
// Deterministic: the same bill on the same day always gives the same 1–3 steps.

import { addDays, daysBetween, formatDate, todayISO } from './dates.js';
import { num, round2, money } from './money.js';

export const BILL_TYPES = [
  { value: 'utility', label: 'Utility (power, water, gas)', recurring: true },
  { value: 'phone', label: 'Phone or internet', recurring: true },
  { value: 'rent', label: 'Rent', recurring: true },
  { value: 'subscription', label: 'Subscription', recurring: true },
  { value: 'medical', label: 'Medical bill', recurring: false },
  { value: 'fine', label: 'Ticket or fine', recurring: false },
  { value: 'other', label: 'Other bill', recurring: false },
];

/** Assumed late fee when the bill doesn't print one. Shown to the user as an estimate. */
export const ASSUMED_LATE_FEE = 30;

const TYPE_BY_VALUE = Object.fromEntries(BILL_TYPES.map((t) => [t.value, t]));

export function normalizeBill(raw = {}) {
  const type = TYPE_BY_VALUE[raw.type] ? raw.type : 'other';
  return {
    payee: String(raw.payee || '').trim() || 'This bill',
    type,
    amount: round2(num(raw.amount)),
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(raw.dueDate || '') ? raw.dueDate : '',
    lateFee: raw.lateFee === null || raw.lateFee === undefined || raw.lateFee === '' ? null : round2(num(raw.lateFee)),
    accountNumber: String(raw.accountNumber || '').trim(),
    canPay: ['yes', 'no'].includes(raw.canPay) ? raw.canPay : 'yes',
    autopay: Boolean(raw.autopay),
    recurring: raw.recurring === undefined ? TYPE_BY_VALUE[type].recurring : Boolean(raw.recurring),
    currency: /^[A-Z]{3}$/.test(raw.currency || '') ? raw.currency : 'USD',
  };
}

/** How urgent a bill is today. */
export function urgency(bill, today = todayISO()) {
  if (!bill.dueDate) return { level: 'unknown', days: null, label: 'No due date' };
  const days = daysBetween(today, bill.dueDate);
  if (days < 0) return { level: 'late', days, label: `${-days} day${days === -1 ? '' : 's'} late` };
  if (days === 0) return { level: 'today', days, label: 'Due today' };
  if (days <= 3) return { level: 'soon', days, label: `Due in ${days} day${days === 1 ? '' : 's'}` };
  return { level: 'later', days, label: `Due ${formatDate(bill.dueDate)}` };
}

function feeText(bill) {
  if (bill.lateFee !== null) return money(bill.lateFee, bill.currency);
  // The assumed fee is a U.S. figure; for other currencies we don't guess a number.
  return bill.currency === 'USD' ? `about ${money(ASSUMED_LATE_FEE, 'USD', { cents: false })}` : 'whatever the bill charges';
}

function scriptWaive(bill) {
  return `"Hi, I'm calling about account ${bill.accountNumber || '[number on the bill]'}. I missed the due date on ${formatDate(bill.dueDate)}. I'd like to pay ${money(bill.amount, bill.currency)} today. Could you waive the late fee as a one-time courtesy? Thank you."`;
}

function scriptPlan(bill) {
  return `"Hi, I'm calling about account ${bill.accountNumber || '[number on the bill]'}. I can't pay the full ${money(bill.amount, bill.currency)} by ${formatDate(bill.dueDate) || 'the due date'}. Can we set up a payment plan or move the due date? What's the smallest amount I can pay today to avoid a late fee?"`;
}

function step(id, fields) {
  return { id, minutes: 2, when: null, script: null, calendar: null, kind: 'do', done: false, ...fields };
}

/**
 * Build 1–3 tiny steps for a bill.
 * @returns {{steps: object[], urgency: object, savingsIfOnTime: number, headline: string}}
 */
export function buildSteps(raw, today = todayISO()) {
  const bill = normalizeBill(raw);
  const u = urgency(bill, today);
  const steps = [];
  // "Late fees avoided" is counted in dollars, so only U.S. bills add to it.
  const fee = bill.currency !== 'USD' ? 0 : (bill.lateFee !== null ? bill.lateFee : ASSUMED_LATE_FEE);

  // Bills that need a check before any money moves.
  if (bill.type === 'medical') {
    steps.push(step('itemize', {
      title: 'Don’t pay yet — ask for an itemized bill',
      detail: 'Medical bills often contain errors. Call the number on the bill and ask for an itemized statement and whether insurance was applied.',
      script: `"Hi, I'm calling about account ${bill.accountNumber || '[number on the bill]'}. Before I pay, could you send me an itemized bill and confirm my insurance was billed? Please put the account on hold until I receive it."`,
      minutes: 5,
      when: today,
      kind: 'call',
    }));
  }
  if (bill.type === 'subscription') {
    steps.push(step('keep-or-cancel', {
      title: `Keep or cancel ${bill.payee}?`,
      detail: `If you haven’t used it in the last 2 weeks, cancel now — it renews for ${money(bill.amount, bill.currency)}${bill.dueDate ? ` on ${formatDate(bill.dueDate)}` : ''}. Search “cancel ${bill.payee}” or open Settings → Subscriptions on your phone.`,
      minutes: 3,
      when: today,
      kind: 'decide',
    }));
  }

  // Timing steps.
  if (u.level === 'late') {
    steps.push(step('pay-now', {
      title: bill.canPay === 'yes' ? `Pay ${money(bill.amount, bill.currency)} now and ask to drop the late fee` : 'Call today: stop the fee from growing',
      detail: bill.canPay === 'yes'
        ? `It’s ${u.label}. Pay, then call and ask for a one-time courtesy waiver of the ${feeText(bill)} late fee — many companies say yes the first time.`
        : `It’s ${u.label}. Call and ask for a payment plan. A small payment today is better than silence.`,
      script: bill.canPay === 'yes' ? scriptWaive(bill) : scriptPlan(bill),
      minutes: 5,
      when: today,
      kind: 'pay',
    }));
  } else if (u.level === 'today' || u.level === 'soon') {
    steps.push(step('pay-now', bill.canPay === 'yes'
      ? {
        title: `Pay ${money(bill.amount, bill.currency)} today`,
        detail: `${u.label}. Paying now takes 2 minutes and avoids a late fee (${feeText(bill)}).`,
        when: today,
        kind: 'pay',
      }
      : {
        title: 'Call before the due date: ask for more time',
        detail: `${u.label}. Calling before it’s late almost always gets a better deal than calling after.`,
        script: scriptPlan(bill),
        minutes: 5,
        when: today,
        kind: 'call',
      }));
  } else if (u.level === 'later') {
    const payDay = addDays(bill.dueDate, -2);
    steps.push(step('pick-day', {
      title: `Lock in your pay day: ${formatDate(payDay)}`,
      detail: `Add a reminder now so future-you doesn’t have to remember. We’ll also show it on your Today screen.`,
      calendar: { date: payDay, label: `Pay ${bill.payee} — ${money(bill.amount, bill.currency)}` },
      minutes: 1,
      when: today,
      kind: 'remind',
    }));
    steps.push(step('pay-on-day', {
      title: `Pay ${money(bill.amount, bill.currency)}`,
      detail: `Your pay day for ${bill.payee}. Due ${formatDate(bill.dueDate)}.`,
      when: payDay,
      kind: 'pay',
    }));
  } else {
    steps.push(step('find-date', {
      title: 'Find the due date',
      detail: 'Look for “Due date”, “Pay by” or “Payment due”. Add it here so we can remind you.',
      minutes: 1,
      when: today,
      kind: 'decide',
    }));
  }

  // Make it automatic next time.
  if (bill.recurring && !bill.autopay && bill.type !== 'subscription') {
    steps.push(step('autopay', {
      title: 'Turn on autopay so you never think about this again',
      detail: `Log in to ${bill.payee}, find “AutoPay” and pick a date 2 days after your payday.`,
      minutes: 5,
      when: u.level === 'later' ? today : addDays(today, 1),
      kind: 'setup',
    }));
  }

  const trimmed = steps.slice(0, 3);
  const savingsIfOnTime = u.level === 'late' ? 0 : fee;
  const first = trimmed[0];
  return {
    bill,
    urgency: u,
    steps: trimmed,
    savingsIfOnTime: round2(savingsIfOnTime),
    headline: first ? first.title : 'All set',
  };
}

/**
 * Pick today's steps across all saved bills: due or overdue steps not yet done,
 * most urgent first.
 */
export function todayQueue(records, today = todayISO()) {
  const rank = { late: 0, today: 1, soon: 2, later: 3, unknown: 4 };
  return records
    .flatMap((r) => r.steps
      .filter((s) => !s.done && (!s.when || s.when <= today))
      .map((s) => ({ record: r, step: s, urgency: urgency(normalizeBill(r.bill), today) })))
    .sort((a, b) => rank[a.urgency.level] - rank[b.urgency.level]
      || (a.record.bill.dueDate || '9999').localeCompare(b.record.bill.dueDate || '9999'));
}

/** Consecutive days (ending today or yesterday) with at least one finished step. */
export function streak(doneDates, today = todayISO()) {
  const set = new Set(doneDates);
  let day = set.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (set.has(day)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}
