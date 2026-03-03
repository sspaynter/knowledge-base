// auth.js — Auth overlay: Google sign-in

import { store } from './store.js';

const overlay = document.getElementById('auth-overlay');
const appEl   = document.getElementById('app');
const authErr = document.getElementById('auth-error');

export function showAuthOverlay() {
  overlay.hidden = false;
  appEl.hidden   = true;

  // Show error if redirected with ?error=auth_failed
  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === 'auth_failed') {
    if (authErr) {
      authErr.textContent = 'Sign in failed. Your account may not be authorised.';
      authErr.hidden = false;
    }
    // Clean URL without reload
    window.history.replaceState({}, '', '/');
  }
}

export function hideAuthOverlay() {
  overlay.hidden = true;
  appEl.hidden   = false;
}
