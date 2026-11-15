// Sample bills for the demo. Companies are fictional. Due dates are relative to today,
// so the demo always shows a realistic mix: late, due soon, due later.

import { addDays, formatDate, todayISO } from '../engine/dates.js';

export const SAMPLES = [
  {
    key: 'power',
    emoji: '⚡',
    label: 'Power bill',
    fields: { payee: 'Lone Star Power & Light', type: 'utility', amount: 142.37, dueIn: 2, lateFee: null, accountNumber: '4471-20983', autopay: false },
    lines: [['Electric service 10/12–11/10', '$128.91'], ['Delivery charge', '$9.80'], ['City fee', '$3.66']],
    summary: 'Your electricity for last month: $142.37, due in 2 days.',
  },
  {
    key: 'ticket',
    emoji: '🅿️',
    label: 'Parking ticket',
    fields: { payee: 'City of Riverside Parking', type: 'fine', amount: 65, dueIn: -3, lateFee: 65, accountNumber: 'PC-883120', autopay: false },
    lines: [['Expired meter, 412 Main St', '$65.00'], ['Penalty if unpaid after due date', '+$65.00']],
    summary: 'A $65 parking ticket that was due 3 days ago; the penalty doubles it.',
  },
  {
    key: 'stream',
    emoji: '📺',
    label: 'Subscription renewal',
    fields: { payee: 'StreamMax Premium', type: 'subscription', amount: 22.99, dueIn: 5, lateFee: null, accountNumber: '', autopay: true },
    lines: [['Premium plan, monthly', '$22.99'], ['Renews automatically', '']],
    summary: 'StreamMax will charge you $22.99 in 5 days unless you cancel.',
  },
  {
    key: 'doctor',
    emoji: '🩺',
    label: 'Doctor’s bill',
    fields: { payee: 'Riverside Medical Group', type: 'medical', amount: 487.2, dueIn: 14, lateFee: null, accountNumber: 'RMG-559301', autopay: false },
    lines: [['Office visit, level 4', '$310.00'], ['Lab panel', '$177.20'], ['Insurance pending', '$0.00']],
    summary: 'A $487.20 doctor’s bill due in 2 weeks; insurance may not be applied yet.',
  },
  {
    key: 'phone',
    emoji: '📱',
    label: 'Phone bill',
    fields: { payee: 'Brightline Wireless', type: 'phone', amount: 85.4, dueIn: 9, lateFee: 7, accountNumber: '310-555-0142', autopay: false },
    lines: [['Unlimited plan, 1 line', '$70.00'], ['Device installment', '$12.50'], ['Taxes & fees', '$2.90']],
    summary: 'Your phone bill is $85.40, due in 9 days. Late fee: $7.',
  },
];

export function sampleFields(sample, today = todayISO()) {
  const { dueIn, ...rest } = sample.fields;
  return { ...rest, dueDate: addDays(today, dueIn) };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Draw a paper-bill style SVG so the sample looks like the photo a user would snap. */
export function sampleSvg(sample, today = todayISO()) {
  const f = sampleFields(sample, today);
  const rows = sample.lines.map(([a, b], i) => `
    <text x="40" y="${300 + i * 34}" font-size="19" fill="#333">${esc(a)}</text>
    <text x="620" y="${300 + i * 34}" font-size="19" fill="#333" text-anchor="end">${esc(b)}</text>`).join('');
  const y = 300 + sample.lines.length * 34 + 30;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="${y + 170}" viewBox="0 0 660 ${y + 170}" font-family="Arial, Helvetica, sans-serif">
  <rect width="660" height="${y + 170}" fill="#fff"/>
  <rect x="0" y="0" width="660" height="10" fill="#334"/>
  <text x="40" y="70" font-size="30" font-weight="700" fill="#111">${esc(f.payee)}</text>
  <text x="40" y="104" font-size="17" fill="#666">${f.type === 'fine' ? 'NOTICE OF PARKING VIOLATION' : f.type === 'subscription' ? 'Your membership renews soon' : 'STATEMENT'}</text>
  <text x="40" y="160" font-size="17" fill="#666">Statement date: ${esc(formatDate(today))}</text>
  ${f.accountNumber ? `<text x="40" y="188" font-size="17" fill="#666">Account #: ${esc(f.accountNumber)}</text>` : ''}
  <line x1="40" y1="250" x2="620" y2="250" stroke="#ddd" stroke-width="2"/>
  ${rows}
  <line x1="40" y1="${y}" x2="620" y2="${y}" stroke="#ddd" stroke-width="2"/>
  <rect x="40" y="${y + 24}" width="580" height="104" rx="10" fill="#f4f4f7"/>
  <text x="62" y="${y + 66}" font-size="20" fill="#333">${f.type === 'subscription' ? 'Renewal amount' : 'Amount due'}</text>
  <text x="598" y="${y + 66}" font-size="30" font-weight="700" fill="#111" text-anchor="end">$${f.amount.toFixed(2)}</text>
  <text x="62" y="${y + 104}" font-size="18" fill="#b42318">${f.type === 'subscription' ? 'Renews on' : 'Due by'} ${esc(formatDate(f.dueDate))}${f.lateFee ? ` · Late fee $${f.lateFee.toFixed(2)}` : ''}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
