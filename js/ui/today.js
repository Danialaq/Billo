// "Today": the daily check-in. One thing to do, a streak, and money kept.

import { todayQueue, streak, normalizeBill, urgency } from '../engine/steps.js';
import { usd, money } from '../engine/money.js';
import { formatDate, todayISO, parseISO } from '../engine/dates.js';
import { moneyWeek, calendarEvents } from '../engine/week.js';
import { buildIcs } from '../engine/ics.js';
import { esc, toast, download } from './dom.js';
import { completeStep, refreshSteps, typeEmoji } from './bill-view.js';
import { celebrate } from './fx.js';
import * as store from '../store.js';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const KIND_LABEL = { due: 'Due', pay: 'Pay day', task: 'Tiny step', done: 'Done' };

function weekHtml(week, selected) {
  const day = week.find((d) => d.date === selected) || week[0];
  return `
  <section class="week" aria-label="Your money for the next 14 days">
    <div class="week-head">
      <h2>Your money, next 14 days</h2>
      <button class="btn btn-ghost btn-sm" data-ics-all>📅 Add all to my calendar</button>
    </div>
    <div class="week-strip" role="tablist">${week.map((d, i) => {
      const date = parseISO(d.date);
      const kinds = [...new Set(d.items.map((x) => x.kind))];
      return `<button class="wday ${d.date === day.date ? 'on' : ''} ${i === 0 ? 'today' : ''}" role="tab" aria-selected="${d.date === day.date}" data-day="${d.date}">
        <span class="wd">${i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}</span>
        <b>${date.getUTCDate()}</b>
        <span class="dots">${kinds.map((k) => `<i class="dot-${k}"></i>`).join('')}</span>
      </button>`;
    }).join('')}</div>
    <div class="week-day">
      <div class="wday-title">${esc(day === week[0] ? 'Today' : formatDate(day.date))}</div>
      ${day.items.length ? day.items.map((x) => `<a class="witem k-${x.kind}" href="#/bill/${esc(x.recordId)}">
        <span class="wtag">${KIND_LABEL[x.kind]}</span><span class="wtext"><b>${esc(x.title)}</b><small>${esc(x.payee)}</small></span><span class="amt">${money(x.amount, x.currency)}</span></a>`).join('')
        : '<p class="muted" style="margin:6px 0 0">Nothing on this day. Enjoy it.</p>'}
    </div>
    <div class="week-legend"><span><i class="dot-due"></i>Due</span><span><i class="dot-pay"></i>Pay day</span><span><i class="dot-task"></i>Tiny step</span><span><i class="dot-done"></i>Done</span></div>
  </section>`;
}

export function mountToday(root) {
  let selected = todayISO();
  function render() {
    const s = store.state();
    const today = todayISO();
    s.bills.forEach((r) => refreshSteps(r, today));
    const queue = todayQueue(s.bills, today);
    const first = queue[0];
    const days = streak(s.doneDates, today);
    const open = s.bills.filter((r) => !r.completedAt);
    if (!s.bills.length) {
      root.innerHTML = `<div class="page"><div class="wrap narrow"><div class="panel empty">
        <div class="big">🌱</div><h2 style="font-size:28px">Nothing here yet</h2>
        <p class="muted">Snap the bill you’ve been avoiding. Billo will turn it into one tiny step.</p>
        <div class="cta-row" style="justify-content:center"><a class="btn btn-primary" href="#/scan">📸 Snap a bill</a><a class="btn btn-ghost" href="#/scan/ticket">Try a sample</a></div>
      </div></div></div>`;
      return;
    }

    root.innerHTML = `<div class="page"><div class="wrap narrow">
      <div class="today-hero">
        <span class="lbl">${greeting()} · ${esc(formatDate(today))}</span>
        <h1>${first ? (queue.length === 1 ? 'Just one thing today.' : `Start with this one.`) : 'You’re all caught up. 🎉'}</h1>
        <p>${first ? `${queue.length} step${queue.length === 1 ? '' : 's'} for today, about ${queue.reduce((m, q) => m + q.step.minutes, 0)} minutes total.` : 'Nothing is due. Snap a new bill when one shows up.'}</p>
        ${first ? `<div class="step first" style="grid-template-columns:44px 1fr">
          <button class="check" data-done="${esc(first.record.id)}|${esc(first.step.id)}" aria-label="Mark done">✓</button>
          <div><span class="urgency ${esc(first.urgency.level)}">${typeEmoji(first.record.bill.type)} ${esc(first.record.bill.payee)} · ${esc(first.urgency.label)}</span>
          <h3 class="mt-8">${esc(first.step.title)}</h3><p>${esc(first.step.detail)}</p>
          <div class="meta"><span class="chip">⏱ ${first.step.minutes} min</span><a class="btn btn-quiet btn-sm" href="#/bill/${esc(first.record.id)}">Open bill</a></div></div>
        </div>` : ''}
      </div>

      <div class="metrics">
        <div class="metric"><b>🔥 ${days}</b><span>day streak</span></div>
        <div class="metric"><b style="color:var(--mint)">${usd(s.saved, { cents: false })}</b><span>late fees avoided</span></div>
        <div class="metric"><b>${open.length}</b><span>open bill${open.length === 1 ? '' : 's'}</span></div>
      </div>

      ${weekHtml(moneyWeek(s.bills, today), selected)}

      ${queue.length > 1 ? `<h2 style="font-size:20px;margin:22px 0 10px">Also today</h2><div class="list">${queue.slice(1).map((q) => `
        <div class="row"><button class="check" data-done="${esc(q.record.id)}|${esc(q.step.id)}" aria-label="Mark done">✓</button>
          <a href="#/bill/${esc(q.record.id)}" style="text-decoration:none;color:inherit"><b>${esc(q.step.title)}</b><small>${esc(q.record.bill.payee)} · ${esc(q.urgency.label)}</small></a>
          <span class="chip">${q.step.minutes} min</span></div>`).join('')}</div>` : ''}

      <h2 style="font-size:20px;margin:22px 0 10px">All bills</h2>
      <div class="list">${s.bills.map((r) => {
        const u = urgency(normalizeBill(r.bill), today);
        return `<a class="row" href="#/bill/${esc(r.id)}"><span class="em">${typeEmoji(r.bill.type)}</span>
          <span><b>${esc(r.bill.payee || 'Bill')}</b><small>${r.completedAt ? '✓ Done' : esc(u.label)}</small></span>
          <span class="amt">${money(r.bill.amount, r.bill.currency)}</span></a>`;
      }).join('')}</div>
      <div class="cta-row mt-24"><a class="btn btn-primary" href="#/scan">📸 Snap another bill</a>${!s.quiz ? '<a class="btn btn-ghost" href="#/quiz">Find my money leaks</a>' : ''}</div>
    </div></div>`;
  }

  root.onclick = (e) => {
    const dayBtn = e.target.closest('[data-day]');
    if (dayBtn) { selected = dayBtn.dataset.day; render(); return; }
    if (e.target.closest('[data-ics-all]')) {
      const events = calendarEvents(store.state().bills);
      if (!events.length) { toast('No upcoming pay days yet'); return; }
      download('billo-money-calendar.ics', buildIcs(events, 'billo-all'), 'text/calendar');
      toast(`${events.length} reminders ready — open the file to add them`);
      return;
    }
    const t = e.target.closest('button[data-done]');
    if (!t) return;
    const [recordId, stepId] = t.dataset.done.split('|');
    const rect = t.getBoundingClientRect();
    const gained = completeStep(recordId, stepId);
    celebrate(rect.left + rect.width / 2, rect.top + rect.height / 2);
    toast(gained ? `Nice! ${usd(gained)} in late fees avoided` : 'Done! Streak kept alive 🔥');
    render();
  };
  render();
}
