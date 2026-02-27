// auth.js — Auth overlay: login and register forms

import * as api from './api.js';
import { store }      from './store.js';
import { toastError } from './toast.js';

const overlay      = document.getElementById('auth-overlay');
const appEl        = document.getElementById('app');
const loginForm    = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError   = document.getElementById('login-error');
const regError     = document.getElementById('register-error');

export function showAuthOverlay() {
  overlay.hidden      = false;
  appEl.hidden        = true;
  loginForm.hidden    = false;
  registerForm.hidden = true;
  loginForm.reset();
}

export function hideAuthOverlay() {
  overlay.hidden = true;
  appEl.hidden   = false;
}

function setError(el, msg) {
  el.textContent = msg; // textContent — safe, no HTML
  el.hidden = false;
}

function clearError(el) {
  el.textContent = '';
  el.hidden = true;
}

// Toggle login / register view
overlay.addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  if (action === 'show-register') {
    loginForm.hidden    = true;
    registerForm.hidden = false;
    clearError(loginError);
    clearError(regError);
  }
  if (action === 'show-login') {
    loginForm.hidden    = false;
    registerForm.hidden = true;
    clearError(loginError);
    clearError(regError);
  }
});

// Login submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError(loginError);
  const data = Object.fromEntries(new FormData(loginForm));
  const btn  = loginForm.querySelector('button[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'Signing in…';
  try {
    // api.login unwraps { user } → returns user object directly
    store.user = await api.login(data);
    hideAuthOverlay();
    window.dispatchEvent(new CustomEvent('kb:authed'));
  } catch (err) {
    setError(loginError, err.message === 'Unauthorized'
      ? 'Invalid username or password.'
      : (err.message || 'Sign in failed.'));
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Sign in';
  }
});

// Register submit
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError(regError);
  const data = Object.fromEntries(new FormData(registerForm));
  const btn  = registerForm.querySelector('button[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'Creating account…';
  try {
    // api.register unwraps { user } → returns user object directly
    store.user = await api.register(data);
    hideAuthOverlay();
    window.dispatchEvent(new CustomEvent('kb:authed'));
  } catch (err) {
    setError(regError, err.message || 'Registration failed. Username may already be taken.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Create account';
  }
});
