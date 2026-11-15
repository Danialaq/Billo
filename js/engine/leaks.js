// "Money leak map": turns 6 quick answers into an estimated yearly ADHD tax.
// Every multiplier is a stated assumption the user can see, not a hidden number.

export const QUESTIONS = [
  {
    id: 'late',
    text: 'How often do you pay a bill late?',
    options: [
      { label: 'Almost never', value: 0 },
      { label: 'Once every few months', value: 0.3 },
      { label: 'About once a month', value: 1 },
      { label: 'Several times a month', value: 2.5 },
    ],
  },
  {
    id: 'subs',
    text: 'How many subscriptions are you paying for but barely use?',
    options: [
      { label: 'None', value: 0 },
      { label: '1–2', value: 1.5 },
      { label: '3–4', value: 3.5 },
      { label: '5 or more', value: 6 },
    ],
  },
  {
    id: 'impulse',
    text: 'In a typical month, how much do you spend on things you regret buying?',
    options: [
      { label: '$0', value: 0 },
      { label: 'Around $50', value: 50 },
      { label: 'Around $150', value: 150 },
      { label: '$300 or more', value: 300 },
    ],
  },
  {
    id: 'overdraft',
    text: 'How many overdraft or returned-payment fees did you get last year?',
    options: [
      { label: 'None', value: 0 },
      { label: '1–2', value: 1.5 },
      { label: '3–5', value: 4 },
      { label: '6 or more', value: 8 },
    ],
  },
  {
    id: 'rebuy',
    text: 'How often do you re-buy something you lost, or miss a return window?',
    options: [
      { label: 'Rarely', value: 0 },
      { label: 'Sometimes', value: 20 },
      { label: 'Often', value: 60 },
    ],
  },
  {
    id: 'feeling',
    text: 'When a bill arrives, what usually happens?',
    options: [
      { label: 'I deal with it right away', value: 'calm' },
      { label: 'I put it off for a few days', value: 'delay' },
      { label: 'I avoid opening it for weeks', value: 'avoid' },
    ],
  },
];

export const ASSUMPTIONS = {
  lateFee: 30,          // per late payment
  subscription: 14,     // per unused subscription per month
  overdraftFee: 30,     // per overdraft or returned payment
};

export const BILLO_PRICE_YEAR = 59.99;

export function leakMap(answers) {
  const a = (id) => (answers[id] === undefined ? 0 : answers[id]);
  const rows = [
    { id: 'late', label: 'Late fees', amount: a('late') * ASSUMPTIONS.lateFee * 12, how: `${a('late')} late payments/month × $${ASSUMPTIONS.lateFee} × 12`, fix: 'Billo turns every bill into a pay day and a reminder.' },
    { id: 'subs', label: 'Forgotten subscriptions', amount: a('subs') * ASSUMPTIONS.subscription * 12, how: `${a('subs')} unused × $${ASSUMPTIONS.subscription}/month × 12`, fix: 'Snap the renewal email — Billo asks “keep or cancel?” before it charges.' },
    { id: 'impulse', label: 'Regret purchases', amount: a('impulse') * 12, how: `$${a('impulse')}/month × 12`, fix: 'Coming soon: a 10-second “pause before you buy” check.' },
    { id: 'overdraft', label: 'Overdraft & returned-payment fees', amount: a('overdraft') * ASSUMPTIONS.overdraftFee, how: `${a('overdraft')} fees/year × $${ASSUMPTIONS.overdraftFee}`, fix: 'Billo plans each pay day 2 days before the due date, so payments don’t bounce.' },
    { id: 'rebuy', label: 'Lost items & missed returns', amount: a('rebuy') * 12, how: `$${a('rebuy')}/month × 12`, fix: 'Coming soon: snap a receipt, get a “return by” reminder.' },
  ].map((r) => ({ ...r, amount: Math.round(r.amount) }))
    .sort((x, y) => y.amount - x.amount);

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const feeling = answers.feeling || 'delay';
  return {
    rows,
    total,
    payback: total > 0 ? Math.round((total / BILLO_PRICE_YEAR) * 10) / 10 : 0,
    feeling,
    headline: total >= 1200
      ? 'You’re paying a serious ADHD tax.'
      : total >= 300
        ? 'Small leaks, adding up.'
        : 'You’re doing better than most.',
  };
}
