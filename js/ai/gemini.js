// Reads a bill photo or PDF with Gemini and returns structured fields.
// The model only extracts what is printed; Billo's rules decide the steps.

import { AI_ENDPOINT } from '../config.js';

const TYPES = ['utility', 'phone', 'rent', 'subscription', 'medical', 'fine', 'other'];

export function aiEnabled() {
  return Boolean(AI_ENDPOINT);
}

async function fileToPart(file) {
  if (file.type === 'application/pdf') {
    return { mimeType: 'application/pdf', data: await toBase64(file) };
  }
  const blob = await downscale(file);
  return { mimeType: 'image/jpeg', data: await toBase64(blob) };
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(blob);
  });
}

/** Shrink large phone photos so upload is fast; keeps text readable. */
async function downscale(file, max = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not open the image'));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round((img.naturalWidth || img.width) * scale);
    canvas.height = Math.round((img.naturalHeight || img.height) * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function clean(json) {
  const out = {
    payee: typeof json.payee === 'string' ? json.payee.slice(0, 60) : '',
    type: TYPES.includes(json.type) ? json.type : 'other',
    amount: Number.isFinite(Number(json.amount)) ? Number(json.amount) : null,
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(json.dueDate || '') ? json.dueDate : '',
    lateFee: Number.isFinite(Number(json.lateFee)) && json.lateFee !== null ? Number(json.lateFee) : null,
    accountNumber: typeof json.accountNumber === 'string' ? json.accountNumber.slice(0, 30) : '',
    autopay: json.autopay === true,
    currency: /^[A-Z]{3}$/.test(json.currency || '') ? json.currency : 'USD',
    confidence: Math.max(0, Math.min(1, Number(json.confidence) || 0)),
    summary: typeof json.summary === 'string' ? json.summary.slice(0, 220) : '',
  };
  return out;
}

/**
 * @param {Blob} file image or PDF
 * @returns {Promise<object>} cleaned fields
 */
export async function readBill(file, { signal } = {}) {
  if (!aiEnabled()) throw new Error('AI reading is not configured');
  const payload = await fileToPart(file);
  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok) throw new Error(json?.error || `AI service error (${res.status})`);
  return clean(json || {});
}

/** Turn an SVG data URL (our sample bills) into a PNG blob, so samples can go through real AI too. */
export async function svgToPng(svgDataUrl, width = 900) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Could not render sample'));
    i.src = svgDataUrl;
  });
  const ratio = (img.naturalHeight || img.height) / (img.naturalWidth || img.width) || 1.3;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round(width * ratio);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
