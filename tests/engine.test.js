import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSteps, todayQueue, streak, urgency, normalizeBill } from '../js/engine/steps.js';
import { leakMap } from '../js/engine/leaks.js';
import { SAMPLES, sampleFields } from '../js/data/samples.js';

const TODAY = '2026-11-15';

test('late bill: pay now and ask for a fee waiver with a script', () => {
  const r = buildSteps({ payee: 'City Parking', type: 'fine', amount: 65, dueDate: '2026-11-12', lateFee: 65 }, TODAY);
  assert.equal(r.urgency.level, 'late');
  assert.equal(r.steps[0].id, 'pay-now');
  assert.match(r.steps[0].script, /waive the late fee/);
  assert.equal(r.savingsIfOnTime, 0);
});

test('can’t pay: call for a payment plan instead', () => {
  const r = buildSteps({ payee: 'Power Co', type: 'utility', amount: 140, dueDate: '2026-11-16', canPay: 'no' }, TODAY);
  assert.equal(r.steps[0].kind, 'call');
  assert.match(r.steps[0].script, /payment plan/);
});

test('due later: pick a pay day two days early, pay on that day, then autopay', () => {
  const r = buildSteps({ payee: 'Brightline', type: 'phone', amount: 85.4, dueDate: '2026-11-24', lateFee: 7 }, TODAY);
  assert.deepEqual(r.steps.map((s) => s.id), ['pick-day', 'pay-on-day', 'autopay']);
  assert.equal(r.steps[0].calendar.date, '2026-11-22');
  assert.equal(r.steps[1].when, '2026-11-22');
  assert.equal(r.savingsIfOnTime, 7);
});

test('medical bill: check before paying', () => {
  const r = buildSteps({ payee: 'Clinic', type: 'medical', amount: 487.2, dueDate: '2026-11-29' }, TODAY);
  assert.equal(r.steps[0].id, 'itemize');
  assert.ok(r.steps.length <= 3);
});

test('subscription: keep-or-cancel first, no autopay nag', () => {
  const r = buildSteps({ payee: 'StreamMax', type: 'subscription', amount: 22.99, dueDate: '2026-11-20', autopay: true }, TODAY);
  assert.equal(r.steps[0].id, 'keep-or-cancel');
  assert.ok(!r.steps.some((s) => s.id === 'autopay'));
});

test('never more than 3 steps, for every sample', () => {
  for (const s of SAMPLES) {
    const r = buildSteps(sampleFields(s, TODAY), TODAY);
    assert.ok(r.steps.length >= 1 && r.steps.length <= 3, s.key);
  }
});

test('missing due date asks the user to find it', () => {
  const r = buildSteps({ payee: 'X', amount: 10 }, TODAY);
  assert.equal(r.urgency.level, 'unknown');
  assert.equal(r.steps[0].id, 'find-date');
});

test('today queue puts late bills first and hides future steps', () => {
  const mk = (id, dueDate) => {
    const plan = buildSteps({ payee: id, type: 'utility', amount: 10, dueDate }, TODAY);
    return { id, bill: plan.bill, steps: plan.steps };
  };
  const q = todayQueue([mk('later', '2026-11-30'), mk('late', '2026-11-10')], TODAY);
  assert.equal(q[0].record.id, 'late');
  assert.ok(q.every((x) => !x.step.when || x.step.when <= TODAY));
});

test('streak counts consecutive days', () => {
  assert.equal(streak(['2026-11-13', '2026-11-14', '2026-11-15'], TODAY), 3);
  assert.equal(streak(['2026-11-13', '2026-11-14'], TODAY), 2);
  assert.equal(streak(['2026-11-10'], TODAY), 0);
});

test('urgency labels', () => {
  assert.equal(urgency(normalizeBill({ dueDate: TODAY }), TODAY).label, 'Due today');
  assert.equal(urgency(normalizeBill({ dueDate: '2026-11-14' }), TODAY).label, '1 day late');
});

test('leak map adds up the stated assumptions', () => {
  const m = leakMap({ late: 1, subs: 1.5, impulse: 50, overdraft: 1.5, rebuy: 20, feeling: 'avoid' });
  // 1*30*12 + 1.5*14*12 + 50*12 + 1.5*30 + 20*12
  assert.equal(m.total, 360 + 252 + 600 + 45 + 240);
  assert.equal(m.rows[0].id, 'impulse');
  assert.ok(m.payback > 20);
});
