// Snap a bill → Billo reads it → 1–3 tiny steps.

import { SAMPLES, sampleFields, sampleSvg } from '../data/samples.js';
import { aiEnabled, readBill, svgToPng } from '../ai/gemini.js';
import { todayISO } from '../engine/dates.js';
import { esc, toast } from './dom.js';
import { renderBill, bindBill, refreshSteps } from './bill-view.js';
import * as store from '../store.js';

const READ_TIMEOUT_MS = 30000;

function samplesHtml() {
  return `<div class="samples">${SAMPLES.map((s) => `
    <button class="sample" data-sample="${esc(s.key)}"><span class="em">${s.emoji}</span><b>${esc(s.label)}</b><span>${esc(s.fields.payee)}</span></button>`).join('')}</div>`;
}

function pickHtml() {
  return `
  <div class="page"><div class="wrap narrow">
    <h1 class="page-title">Snap a bill</h1>
    <p class="page-sub">Any bill, ticket, renewal email or statement. Billo tells you the one thing to do.</p>
    <label class="drop" id="drop">
      <input type="file" id="file" accept="image/*,application/pdf" capture="environment">
      <div class="big">📸</div>
      <h2>Take a photo or upload</h2>
      <div class="fine">JPG, PNG or PDF${aiEnabled() ? '' : ' · AI reading is off in this build — you’ll type 3 numbers'}</div>
    </label>
    <div class="privacy">🔒 <span>No account. Your photo is sent once to Google Gemini to read the text, then your bill lives only in this browser.</span></div>
    <div class="or">or try a sample bill</div>
    ${samplesHtml()}
    <div class="center mt-16"><button class="btn btn-quiet" data-manual>Type it in instead</button></div>
  </div></div>`;
}

function readingHtml(img) {
  return `<div class="page"><div class="wrap narrow"><div class="panel reading">
    ${img ? `<img src="${esc(img)}" alt="Your bill">` : ''}
    <h2 style="font-size:24px"><span class="pulse"></span>Reading your bill…</h2>
    <p class="muted">Finding who, how much and when. About 5 seconds.</p>
  </div></div></div>`;
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('Reading took too long')), ms))]);
}

async function thumbnail(file) {
  if (!file.type.startsWith('image/')) return '';
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 320 / img.width);
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.7);
  } catch {
    return '';
  } finally {
    URL.revokeObjectURL(url);
  }
}

function saveRecord({ bill, source, image, sampleKey }) {
  const record = refreshSteps({
    id: store.newId(),
    createdAt: new Date().toISOString(),
    source,
    sampleKey: sampleKey || null,
    image: image || '',
    bill: { canPay: 'yes', ...bill },
    steps: [],
  });
  store.update((s) => { s.bills.unshift(record); });
  return record;
}

export function mountScan(root, { go, sampleKey }) {
  async function runSample(key) {
    const sample = SAMPLES.find((s) => s.key === key);
    if (!sample) return;
    const img = sampleSvg(sample);
    root.innerHTML = readingHtml(img);
    const fallback = { ...sampleFields(sample), summary: sample.summary, confidence: 1 };
    let bill = fallback;
    let source = 'sample';
    if (aiEnabled()) {
      try {
        const png = await svgToPng(img);
        const read = await withTimeout(readBill(png), READ_TIMEOUT_MS);
        if (read.confidence >= 0.5 && read.amount) {
          bill = { ...read, amount: read.amount, dueDate: read.dueDate || fallback.dueDate };
          source = 'ai';
        }
      } catch { /* keep the sample's known fields so the demo never fails */ }
    } else {
      await new Promise((r) => setTimeout(r, 700));
    }
    const record = saveRecord({ bill, source, image: img, sampleKey: key });
    go(`#/bill/${record.id}`);
  }

  async function runFile(file) {
    const img = await thumbnail(file);
    if (!aiEnabled()) {
      const record = saveRecord({ bill: { payee: '', type: 'other', amount: 0, dueDate: '', summary: 'Type the amount and due date — Billo does the rest.' }, source: 'manual', image: img });
      go(`#/bill/${record.id}`);
      return;
    }
    root.innerHTML = readingHtml(img);
    try {
      const read = await withTimeout(readBill(file), READ_TIMEOUT_MS);
      if (read.confidence === 0) {
        toast('That doesn’t look like a bill. Try another photo or type it in.');
        mountScan(root, { go });
        return;
      }
      const record = saveRecord({ bill: read, source: 'ai', image: img });
      go(`#/bill/${record.id}`);
    } catch (err) {
      toast(`${err.message}. You can type it in.`);
      const record = saveRecord({ bill: { payee: '', type: 'other', amount: 0, dueDate: '', summary: 'We couldn’t read this one. Check the 3 fields below.' }, source: 'manual', image: img });
      go(`#/bill/${record.id}`);
    }
  }

  if (sampleKey) { runSample(sampleKey); return; }

  root.innerHTML = pickHtml();
  const drop = root.querySelector('#drop');
  const input = root.querySelector('#file');
  input.onchange = () => { if (input.files[0]) runFile(input.files[0]); };
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) runFile(f); });
  root.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.sample) runSample(t.dataset.sample);
    if (t.hasAttribute('data-manual')) {
      const record = saveRecord({ bill: { payee: '', type: 'other', amount: 0, dueDate: '', summary: '' }, source: 'manual' });
      go(`#/bill/${record.id}`);
    }
  };
}

export function mountBillPage(root, { id, go }) {
  function render() {
    const record = store.getBill(id);
    if (!record) {
      root.innerHTML = '<div class="page"><div class="wrap narrow"><div class="panel empty"><div class="big">🤷</div><h2>Bill not found</h2><a class="btn btn-primary mt-16" href="#/scan">Snap a bill</a></div></div></div>';
      return;
    }
    refreshSteps(record, todayISO());
    const s = store.state();
    root.innerHTML = `<div class="page"><div class="wrap narrow">
      <p class="fine"><a href="#/today">← Today</a></p>
      ${renderBill(record)}
      ${!s.quiz ? `<div class="panel mt-16" style="background:var(--brand-soft);border-color:#d8cffd">
        <h2 style="font-size:22px">How much is ADHD costing you a year?</h2>
        <p class="muted" style="margin:6px 0 14px">6 quick taps. See your personal money-leak map.</p>
        <a class="btn btn-primary" href="#/quiz">Take the 60-second check</a></div>`
        : `<div class="cta-row mt-16"><a class="btn btn-primary" href="#/today">Go to Today</a><a class="btn btn-ghost" href="#/scan">Snap another bill</a></div>`}
    </div></div>`;
    bindBill(root, id, render);
  }
  render();
}
