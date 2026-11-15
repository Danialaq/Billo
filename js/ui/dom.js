// Small DOM helpers shared by the views.

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Read a nested value by dotted path: get(obj, 'bill.lines.0.charge'). */
export function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/** Write a nested value by dotted path, creating objects/arrays as needed. */
export function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  keys.slice(0, -1).forEach((key, i) => {
    if (cur[key] == null) cur[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    cur = cur[key];
  });
  cur[keys[keys.length - 1]] = value;
}

let toastTimer = null;
export function toast(message) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

export function download(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

export function moneyField(path, label, value, hint = '') {
  return `<label class="field"><span>${esc(label)}</span>
    <div class="money-input"><input inputmode="decimal" name="${esc(path)}" value="${esc(value ?? '')}" placeholder="0.00" autocomplete="off"></div>
    ${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
}

export function textField(path, label, value, { type = 'text', hint = '', placeholder = '' } = {}) {
  return `<label class="field"><span>${esc(label)}</span>
    <input type="${type}" name="${esc(path)}" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}" autocomplete="off">
    ${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
}

export function selectField(path, label, value, options, hint = '') {
  return `<label class="field"><span>${esc(label)}</span>
    <select name="${esc(path)}" data-rerender>${options.map((o) => `<option value="${esc(o.value)}" ${o.value === value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>
    ${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
}

export function checkField(path, label, checked, hint = '') {
  return `<label class="check"><input type="checkbox" name="${esc(path)}" ${checked ? 'checked' : ''} data-rerender>
    <span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span></label>`;
}

export function choiceGroup(path, value, options) {
  return `<div class="choice-row" role="radiogroup">${options.map((o, i) => `
    <div class="choice"><input type="radio" id="${esc(path)}-${i}" name="${esc(path)}" value="${esc(o.value)}" ${o.value === value ? 'checked' : ''} data-rerender>
    <label for="${esc(path)}-${i}">${esc(o.label)}${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</label></div>`).join('')}</div>`;
}
