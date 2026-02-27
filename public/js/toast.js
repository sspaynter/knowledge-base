// toast.js — Transient notification toasts

const container = document.getElementById('toast-container');

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 * @param {number} [duration=3000]
 */
export function toast(message, type = 'info', duration = 3000) {
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message; // textContent — safe, no HTML
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 200ms ease';
    setTimeout(() => el.remove(), 210);
  }, duration);
}

export const toastSuccess = (msg, dur) => toast(msg, 'success', dur);
export const toastError   = (msg, dur) => toast(msg, 'error',   dur);
export const toastInfo    = (msg, dur) => toast(msg, 'info',    dur);
