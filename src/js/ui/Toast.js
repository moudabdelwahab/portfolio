import { icon } from './icon.js';
import { escapeHTML } from '../components/renderUtils.js';

/**
 * Toast — إشعارات قصيرة في #toast-root (موجود في admin.html فقط، يحمل
 * class="toast-stack" مباشرة في الـ HTML). تُستخدم لإعلام المستخدم بنجاح
 * الحفظ (autosave)، فشل تحقق البيانات، أو نجاح Import/Export.
 */

const ICONS_BY_TYPE = {
  success: 'check',
  error: 'alert',
  info: 'alert',
};

const DEFAULT_DURATION_MS = 4000;

let counter = 0;

/**
 * @param {string} message
 * @param {{ type?: 'success'|'error'|'info', duration?: number }} [options]
 */
export function showToast(message, { type = 'info', duration = DEFAULT_DURATION_MS } = {}) {
  const stack = document.getElementById('toast-root');
  if (!stack) {
    console.warn('[Toast] لا يوجد #toast-root في الصفحة — تعذّر عرض:', message);
    return;
  }

  const id = `toast-${++counter}`;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.id = id;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `${icon(ICONS_BY_TYPE[type] || 'alert', { size: 16 })}<span>${escapeHTML(message)}</span>`;

  stack.appendChild(el);

  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }

  return id;
}

/** @param {string} id */
export function dismissToast(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.transition = 'opacity .2s ease, transform .2s ease';
  el.style.opacity = '0';
  el.style.transform = 'translateY(6px)';
  setTimeout(() => el.remove(), 200);
}

export const toast = {
  success: (msg, opts) => showToast(msg, { ...opts, type: 'success' }),
  error: (msg, opts) => showToast(msg, { ...opts, type: 'error' }),
  info: (msg, opts) => showToast(msg, { ...opts, type: 'info' }),
};
