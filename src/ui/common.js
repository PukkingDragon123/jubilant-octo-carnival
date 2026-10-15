// Shared UI helpers.
import { icon } from './pixel.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function fillIcons(root = document) {
  for (const el of $$('[data-icon]', root)) {
    if (el.dataset.filled === el.dataset.icon) continue;
    const size = +(el.dataset.size || (el.closest('.nav') ? 28 : 24));
    el.innerHTML = icon(el.dataset.icon, size);
    el.dataset.filled = el.dataset.icon;
  }
}

// Segmented bar markup. p in [0, 1].
export function segBar(p, n = 12, cls = 'seg-green') {
  const on = Math.max(0, Math.min(n, p * n));
  let html = '';
  for (let i = 0; i < n; i++) html += `<i class="${i < Math.floor(on) ? 'on' : ''}"></i>`;
  return `<div class="bar ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p * 100)}">${html}</div>`;
}

export function setBar(el, p, n = 12) {
  if (!el) return;
  if (el.children.length !== n) el.innerHTML = '<i></i>'.repeat(n);
  const on = Math.floor(Math.max(0, Math.min(1, p)) * n);
  [...el.children].forEach((c, i) => c.classList.toggle('on', i < on));
}

export function heartsHtml(n, size = 14) {
  let h = '';
  for (let i = 0; i < 5; i++) h += icon(i < n ? 'heart' : 'heartEmpty', size);
  return h;
}

export { icon };
