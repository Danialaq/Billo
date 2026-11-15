// "Share my ADHD tax": draws a 1080×1350 card (Instagram/TikTok size) and shares it,
// or downloads it when the browser can't share files.

import { usd } from '../engine/money.js';
import { copyText, toast } from './dom.js';

const W = 1080;
const H = 1350;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function drawTaxCard(map, siteUrl) {
  try { await Promise.all([document.fonts.load('800 120px "Bricolage Grotesque"'), document.fonts.load('700 40px Inter')]); } catch { /* fallback fonts are fine */ }
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const display = '"Bricolage Grotesque", Inter, sans-serif';

  ctx.fillStyle = '#1c1930';
  ctx.fillRect(0, 0, W, H);
  // falling dollars
  ctx.fillStyle = 'rgba(255,211,107,.18)';
  ctx.font = `800 64px ${display}`;
  [[860, 120], [960, 300], [790, 420], [990, 560], [880, 700]].forEach(([x, y]) => ctx.fillText('$', x, y));

  // logo
  ctx.save();
  ctx.translate(96, 92);
  ctx.rotate(-0.1);
  ctx.fillStyle = '#5b3df5';
  roundRect(ctx, -32, -32, 64, 64, 18);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `800 40px ${display}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('b', 0, 2);
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = `800 44px ${display}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('billo', 148, 108);

  ctx.fillStyle = '#ffd36b';
  ctx.font = '700 34px Inter, sans-serif';
  ctx.fillText('MY ADHD TAX', 72, 300);
  ctx.fillStyle = '#fff';
  ctx.font = `800 220px ${display}`;
  ctx.fillText(usd(map.total, { cents: false }), 64, 500);
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.font = '600 44px Inter, sans-serif';
  ctx.fillText('a year, lost to late fees,', 72, 580);
  ctx.fillText('forgotten renewals & regret buys.', 72, 640);

  // top leaks as bars
  const rows = map.rows.filter((r) => r.amount > 0).slice(0, 3);
  const max = Math.max(1, ...rows.map((r) => r.amount));
  rows.forEach((r, i) => {
    const y = 760 + i * 130;
    ctx.fillStyle = '#fff';
    ctx.font = '700 38px Inter, sans-serif';
    ctx.fillText(r.label, 72, y);
    ctx.textAlign = 'right';
    ctx.fillText(usd(r.amount, { cents: false }), W - 72, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    roundRect(ctx, 72, y + 22, W - 144, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#ff6a4d';
    roundRect(ctx, 72, y + 22, Math.max(30, (W - 144) * (r.amount / max)), 22, 11);
    ctx.fill();
  });

  // CTA
  ctx.fillStyle = '#ffd36b';
  roundRect(ctx, 72, H - 190, W - 144, 110, 28);
  ctx.fill();
  ctx.fillStyle = '#1c1930';
  ctx.font = `800 46px ${display}`;
  ctx.textAlign = 'center';
  ctx.fillText(`What’s yours? → ${siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}`, W / 2, H - 120);
  ctx.textAlign = 'left';

  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

export async function shareTaxCard(map) {
  const site = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
  const text = `My ADHD tax is ${usd(map.total, { cents: false })} a year 😬 What’s yours? ${site}`;
  const blob = await drawTaxCard(map, site);
  const file = new File([blob], 'my-adhd-tax.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'My ADHD tax', text });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-adhd-tax.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  await copyText(text);
  toast('Card saved and caption copied — post it anywhere');
}
