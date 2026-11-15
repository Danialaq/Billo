// The heart of Billo: what we read on the bill, and the 1–3 tiny steps.
// Used right after a scan and when opening a saved bill.

import { BILL_TYPES, buildSteps, ASSUMED_LATE_FEE } from '../engine/steps.js';
import { usd, money } from '../engine/money.js';
import { formatDate, todayISO } from '../engine/dates.js';
import { buildIcs } from '../engine/ics.js';
import { esc, download, toast, copyText } from './dom.js';
import { celebrate } from './fx.js';
import * as store from '../store.js';

const TYPE_EMOJI = { utility: '⚡', phone: '📱', rent: '🏠', subscription: '🔁', medical: '🩺', fine: '🅿️', other: '🧾' };

export function typeEmoji(type) {
  return TYPE_EMOJI[type] || '🧾';
}

/** Recompute steps for a record, keeping the done state of steps that still exist. */
export function refreshSteps(record, today = todayISO()) {
  const plan = buildSteps(record.bill, today);
  const doneById = Object.fromEntries((record.steps || []).map((s) => [s.id, s]));
  record.steps = plan.steps.map((s) => (doneById[s.id]?.done ? { ...s, done: true, doneAt: doneById[s.id].doneAt } : s));
  record.urgency = plan.urgency;
  record.savingsIfOnTime = plan.savingsIfOnTime;
  return record;
}

/** Mark a step done, update streak and late fees avoided. */
export function completeStep(recordId, stepId, today = todayISO()) {
  let gained = 0;
  store.update((s) => {
    const r = s.bills.find((b) => b.id === recordId);
    if (!r) return;
    const st = r.steps.find((x) => x.id === stepId);
    if (!st || st.done) return;
    st.done = true;
    st.doneAt = today;
    if (!s.doneDates.includes(today)) s.doneDates.push(today);
    if (st.kind === 'pay' && !r.feeCounted && r.urgency?.level !== 'late') {
      gained = r.savingsIfOnTime || 0;
      r.feeCounted = true;
      s.saved = Math.round((s.saved + gained) * 100) / 100;
    }
    if (r.steps.every((x) => x.done)) r.completedAt = today;
  });
  return gained;
}

function stepHtml(s, i) {
  return `<div class="step ${s.done ? 'done' : ''} ${i === 0 && !s.done ? 'first' : ''}" data-step="${esc(s.id)}">
    <button class="check" data-done="${esc(s.id)}" aria-label="Mark done">✓</button>
    <div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.detail)}</p>
      <div class="meta">
        <span class="chip">⏱ ${s.minutes} min</span>
        ${s.when && s.when > todayISO() ? `<span class="chip">📅 ${esc(formatDate(s.when))}</span>` : '<span class="chip">Today</span>'}
        ${s.script ? `<button class="btn btn-quiet btn-sm" data-script="${esc(s.id)}">What to say</button>` : ''}
        ${s.calendar ? `<button class="btn btn-quiet btn-sm" data-cal="${esc(s.id)}">Add reminder</button>` : ''}
      </div>
      ${s.script ? `<div class="script hide" id="script-${esc(s.id)}">${esc(s.script)}<div class="mt-8"><button class="btn btn-ghost btn-sm" data-copy="${esc(s.id)}">Copy</button></div></div>` : ''}
    </div>
  </div>`;
}

export function renderBill(record) {
  const b = record.bill;
  const u = record.urgency;
  const conf = record.source === 'ai'
    ? `<span class="conf ${b.confidence >= 0.7 ? 'hi' : 'lo'}">${b.confidence >= 0.7 ? '✓ Read by AI' : '⚠ AI isn’t sure — check the numbers'}</span>`
    : record.source === 'sample' ? '<span class="conf hi">Sample bill</span>' : '<span class="conf lo">Typed in</span>';
  const doneCount = record.steps.filter((s) => s.done).length;
  return `
    <div class="panel">
      <div class="result-head">
        ${record.image ? `<img src="${esc(record.image)}" alt="Your bill">` : `<div style="font-size:64px;text-align:center">${typeEmoji(b.type)}</div>`}
        <div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${conf}<span class="urgency ${esc(u.level)}">${esc(u.label)}</span></div>
          <h2 style="font-size:28px;margin-top:10px">${esc(b.payee)}</h2>
          ${b.summary ? `<p class="summary">${esc(b.summary)}</p>` : ''}
          <div class="facts">
            <div class="fact"><label for="f-amount">Amount${b.currency && b.currency !== 'USD' ? ` (${esc(b.currency)})` : ''}</label><input id="f-amount" data-field="amount" inputmode="decimal" value="${esc(Number(b.amount || 0).toFixed(2))}"></div>
            <div class="fact"><label for="f-due">Due date</label><input id="f-due" data-field="dueDate" type="date" value="${esc(b.dueDate)}"></div>
            <div class="fact"><label for="f-payee">Who</label><input id="f-payee" data-field="payee" value="${esc(b.payee)}"></div>
            <div class="fact"><label for="f-type">Type</label><select id="f-type" data-field="type">${BILL_TYPES.map((t) => `<option value="${t.value}" ${t.value === b.type ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select></div>
          </div>
          <div class="toggle-row">
            <span>Can you pay it in full right now?</span>
            <div class="seg" role="group" aria-label="Can you pay now">
              <button data-canpay="yes" class="${b.canPay !== 'no' ? 'on' : ''}">Yes</button>
              <button data-canpay="no" class="${b.canPay === 'no' ? 'on' : ''}">Not right now</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
        <h2 style="font-size:24px">Your ${record.steps.length === 1 ? 'one step' : `${record.steps.length} tiny steps`}</h2>
        <span class="fine">${doneCount}/${record.steps.length} done${record.savingsIfOnTime ? ` · on time saves ${b.lateFee !== null && b.lateFee !== undefined ? money(b.lateFee, b.currency) : `~${usd(ASSUMED_LATE_FEE, { cents: false })}`}` : ''}</span>
      </div>
      <div class="steps">${record.steps.map(stepHtml).join('')}</div>
    </div>`;
}

/** Wire up a rendered bill inside `root`. `onChange` re-renders the page. */
export function bindBill(root, recordId, onChange) {
  root.onclick = async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const record = store.getBill(recordId);
    if (!record) return;
    if (t.dataset.done) {
      const rect = t.getBoundingClientRect();
      const gained = completeStep(recordId, t.dataset.done);
      celebrate(rect.left + rect.width / 2, rect.top + rect.height / 2);
      toast(gained ? `Nice! ${usd(gained)} in late fees avoided` : 'Done! One less thing in your head');
      onChange();
    }
    if (t.dataset.script) root.querySelector(`#script-${CSS.escape(t.dataset.script)}`)?.classList.toggle('hide');
    if (t.dataset.copy) {
      const s = record.steps.find((x) => x.id === t.dataset.copy);
      toast((await copyText(s.script)) ? 'Copied' : 'Select the text to copy');
    }
    if (t.dataset.cal) {
      const s = record.steps.find((x) => x.id === t.dataset.cal);
      download(`billo-${record.bill.payee.replace(/\W+/g, '-').toLowerCase()}.ics`, buildIcs([{ ...s.calendar, detail: `Billo reminder: ${s.calendar.label}` }], record.id), 'text/calendar');
      toast('Reminder file downloaded — open it to add to your calendar');
    }
    if (t.dataset.canpay) {
      store.update((s) => {
        const r = s.bills.find((b) => b.id === recordId);
        r.bill.canPay = t.dataset.canpay;
        refreshSteps(r);
      });
      onChange();
    }
  };
  root.onchange = (e) => {
    const field = e.target.dataset.field;
    if (!field) return;
    store.update((s) => {
      const r = s.bills.find((b) => b.id === recordId);
      r.bill[field] = field === 'amount' ? Number(String(e.target.value).replace(/[$,]/g, '')) || 0 : e.target.value;
      refreshSteps(r);
    });
    onChange();
  };
}
