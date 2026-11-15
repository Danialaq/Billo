// Quiz → money-leak map → Billo Plus. The Zimran-style funnel, after the user already got value.

import { QUESTIONS, leakMap, ASSUMPTIONS, BILLO_PRICE_YEAR } from '../engine/leaks.js';
import { usd } from '../engine/money.js';
import { esc, toast } from './dom.js';
import { shareTaxCard } from './share.js';
import * as store from '../store.js';

export function mountQuiz(root, { go }) {
  const answers = {};
  let i = 0;
  function render() {
    const q = QUESTIONS[i];
    root.innerHTML = `<div class="page"><div class="wrap narrow">
      <div class="quiz-progress" aria-hidden="true"><div style="width:${(i / QUESTIONS.length) * 100}%"></div></div>
      <div class="q">
        <p class="fine">Question ${i + 1} of ${QUESTIONS.length}</p>
        <h2>${esc(q.text)}</h2>
        <div class="answers">${q.options.map((o, k) => `<button class="answer" data-k="${k}">${esc(o.label)}</button>`).join('')}</div>
        ${i > 0 ? '<button class="btn btn-quiet mt-16" data-back>← Back</button>' : ''}
      </div>
    </div></div>`;
  }
  root.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-back')) { i -= 1; render(); return; }
    if (t.dataset.k === undefined) return;
    const q = QUESTIONS[i];
    answers[q.id] = q.options[Number(t.dataset.k)].value;
    if (i < QUESTIONS.length - 1) { i += 1; render(); return; }
    store.update((s) => { s.quiz = answers; });
    go('#/leaks');
  };
  render();
}

export function mountLeaks(root) {
  const s = store.state();
  if (!s.quiz) { window.location.hash = '#/quiz'; return; }
  const map = leakMap(s.quiz);
  const max = Math.max(1, ...map.rows.map((r) => r.amount));
  const feelingLine = {
    calm: 'You deal with bills fast — Billo just makes sure nothing slips through.',
    delay: 'You put bills off for a few days. That’s exactly where late fees come from — Billo gives each one a pay day.',
    avoid: 'Avoiding bills for weeks is the ADHD freeze, not laziness. Billo’s whole job is to make the first step tiny.',
  }[map.feeling];
  root.innerHTML = `<div class="page"><div class="wrap narrow">
    <div class="leak-total">
      <span class="lbl">Your estimated ADHD tax</span>
      <b>${usd(map.total, { cents: false })}<span style="font-size:.4em;opacity:.8"> / year</span></b>
      <p style="margin:0;font-size:18px">${esc(map.headline)} ${esc(feelingLine)}</p>
    </div>
    <div class="panel mt-16">
      <h2 style="font-size:22px;margin-bottom:6px">Where it leaks</h2>
      ${map.rows.map((r) => `<div class="leak-row">
        <b>${esc(r.label)}</b><b>${usd(r.amount, { cents: false })}</b>
        <div class="bar"><div style="width:${Math.round((r.amount / max) * 100)}%"></div></div>
        <small>${esc(r.how)} · ${esc(r.fix)}</small></div>`).join('')}
      <p class="fine mt-16">Estimates from your answers. Assumes $${ASSUMPTIONS.lateFee} per late or overdraft fee and $${ASSUMPTIONS.subscription}/month per unused subscription.</p>
    </div>
    <div class="panel mt-16 center">
      <h2 style="font-size:24px">${map.payback >= 1 ? `Billo Plus pays for itself ${map.payback}× over` : 'Keep your streak going with Billo Plus'}</h2>
      <p class="muted">${usd(BILLO_PRICE_YEAR)} a year vs. ${usd(map.total, { cents: false })} in leaks.</p>
      <div class="cta-row mt-8" style="justify-content:center">
        <a class="btn btn-primary btn-lg" href="#/plus">Plug my leaks</a>
        <button class="btn btn-ghost btn-lg" data-share>📣 Share my ADHD tax</button>
      </div>
      <p class="fine mt-16">Makes a 1080×1350 card for Instagram, TikTok or a group chat.</p>
    </div>
  </div></div>`;
  root.onclick = async (e) => {
    const b = e.target.closest('[data-share]');
    if (!b) return;
    b.disabled = true;
    try { await shareTaxCard(map); } catch { toast('Could not make the card — try again'); }
    b.disabled = false;
  };
}

export function mountPlus(root, { go }) {
  let plan = 'year';
  function render() {
    const s = store.state();
    root.innerHTML = `<div class="page"><div class="wrap narrow">
      <h1 class="page-title">Billo Plus</h1>
      <p class="page-sub">Everything you need to stop paying the ADHD tax.</p>
      <ul class="perks panel">
        <li>Unlimited bill scans with AI reading</li>
        <li>Reminders on your pay days, synced to your calendar</li>
        <li>“Keep or cancel?” before every subscription renews</li>
        <li>Call scripts for late fees, payment plans and medical bills</li>
        <li>Shared household view for couples (coming soon)</li>
      </ul>
      <div class="plans">
        <button class="plan ${plan === 'year' ? 'on' : ''}" data-plan="year"><span class="save">Save 50%</span><small>Yearly</small><br><b>$59.99</b><br><small>$5 / month · 7-day free trial</small></button>
        <button class="plan ${plan === 'month' ? 'on' : ''}" data-plan="month"><small>Monthly</small><br><b>$9.99</b><br><small>Cancel anytime</small></button>
      </div>
      <button class="btn btn-primary btn-lg btn-block" data-start>${s.plus ? 'You’re on Billo Plus ✓' : 'Start my 7-day free trial'}</button>
      <p class="fine center mt-16">Free plan: 3 bill scans a month. Hackathon demo: no card needed and nothing is charged — Plus unlocks instantly.</p>
    </div></div>`;
  }
  root.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.plan) { plan = t.dataset.plan; render(); }
    if (t.hasAttribute('data-start')) {
      store.update((s) => { s.plus = true; });
      toast('Billo Plus unlocked (demo — no charge)');
      go('#/today');
    }
  };
  render();
}
