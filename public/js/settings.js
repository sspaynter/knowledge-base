// settings.js — Settings overlay panels.
// All content uses textContent. No untrusted HTML from API rendered.

import * as api from './api.js';
import { store } from './store.js';
import { toastSuccess, toastError } from './toast.js';

const body = document.getElementById('settings-body');
const nav  = document.querySelector('.settings-panel__nav');

let activeSection = 'workspaces';

export function initSettings() {
  if (!nav.dataset.bound) {
    nav.dataset.bound = 'true';
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.settings-nav-item');
      if (!btn) return;
      nav.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('settings-nav-item--active'));
      btn.classList.add('settings-nav-item--active');
      activeSection = btn.dataset.section;
      loadSection(activeSection);
    });
  }
  loadSection(activeSection);
}

function loadSection(section) {
  body.textContent = ''; // safe clear
  const fn = { workspaces: renderWorkspaces, users: renderUsers, tokens: renderTokens, account: renderAccount, danger: renderDanger }[section];
  if (fn) fn();
}

// ── Shared helpers ────────────────────────────
function heading(text) {
  const h = document.createElement('h3');
  h.style.cssText = 'font-size:15px;font-weight:600;margin-bottom:16px;';
  h.textContent = text; // textContent — safe
  return h;
}

function settingsRow(labelText, control) {
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-soft);gap:12px;';
  const label = document.createElement('span');
  label.style.cssText = 'font-size:13px;flex:1;';
  label.textContent = labelText; // textContent — safe
  div.appendChild(label);
  if (control) div.appendChild(control);
  return div;
}

function btn(label, onClick, danger = false) {
  const b = document.createElement('button');
  b.className = 'btn btn--ghost btn--sm';
  if (danger) b.style.color = 'var(--red)';
  b.textContent = label; // textContent — safe
  b.addEventListener('click', onClick);
  return b;
}

function btnGroup(...buttons) {
  const g = document.createElement('div');
  g.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';
  buttons.forEach(b => g.appendChild(b));
  return g;
}

function notice(text) {
  const p = document.createElement('p');
  p.style.cssText = 'color:var(--text-3);font-size:13px;padding:16px 0;';
  p.textContent = text; // textContent — safe
  return p;
}

function addBtn(label, onClick) {
  const b = document.createElement('button');
  b.className = 'btn btn--ghost btn--sm';
  b.style.marginTop = '16px';
  b.textContent = label; // textContent — safe
  b.addEventListener('click', onClick);
  return b;
}

// ── Workspaces ────────────────────────────────
async function renderWorkspaces() {
  body.appendChild(heading('Workspaces'));
  try {
    const workspaces = await api.listWorkspaces();
    if (workspaces.length === 0) {
      body.appendChild(notice('No workspaces yet.'));
    } else {
      workspaces.forEach(ws => {
        body.appendChild(settingsRow(ws.name, btnGroup(
          btn('Rename', async () => {
            const name = window.prompt('New name:', ws.name);
            if (!name?.trim()) return;
            try {
              await api.updateWorkspace(ws.id, { name: name.trim() });
              toastSuccess('Workspace renamed');
              renderWorkspaces();
            } catch (err) { toastError(err.message); }
          }),
          btn('Delete', async () => {
            if (!window.confirm('Delete workspace "' + ws.name + '"? All content will be removed.')) return;
            try {
              await api.deleteWorkspace(ws.id);
              store.workspaces = store.workspaces.filter(w => w.id !== ws.id);
              toastSuccess('Workspace deleted');
              loadSection('workspaces');
            } catch (err) { toastError(err.message); }
          }, true),
        )));
      });
    }
    body.appendChild(addBtn('+ Add workspace', async () => {
      const name = window.prompt('Workspace name:');
      if (!name?.trim()) return;
      try {
        const ws = await api.createWorkspace({ name: name.trim(), icon: 'folder' });
        store.workspaces.push(ws);
        toastSuccess('Workspace created');
        loadSection('workspaces');
      } catch (err) { toastError(err.message); }
    }));
  } catch (_) {
    body.appendChild(notice('Could not load workspaces.'));
  }
}

// ── Users & Roles ─────────────────────────────
async function renderUsers() {
  body.appendChild(heading('Users & Roles'));
  if (store.user?.role !== 'admin') { body.appendChild(notice('Admin access required.')); return; }
  try {
    const users = await api.listUsers();
    const ROLES = ['admin', 'editor', 'viewer'];
    users.forEach(u => {
      const sel = document.createElement('select');
      sel.className = 'input';
      sel.style.cssText = 'width:100px;padding:4px 8px;font-size:12px;';
      ROLES.forEach(r => {
        const o = document.createElement('option');
        o.value = r;
        o.textContent = r; // textContent — safe
        if (r === u.role) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', async () => {
        try {
          await api.updateUser(u.id, { role: sel.value });
          toastSuccess((u.display_name || u.username) + ' updated to ' + sel.value);
        } catch (err) { toastError(err.message); sel.value = u.role; }
      });
      const controls = btnGroup(sel);
      if (u.id !== store.user?.id) {
        controls.appendChild(btn('Remove', async () => {
          if (!window.confirm('Remove user ' + u.username + '?')) return;
          try { await api.deleteUser(u.id); toastSuccess('User removed'); renderUsers(); }
          catch (err) { toastError(err.message); }
        }, true));
      }
      body.appendChild(settingsRow((u.display_name || u.username) + '  (' + u.username + ')', controls));
    });
  } catch (_) {
    body.appendChild(notice('Could not load users.'));
  }
}

// ── API Tokens ────────────────────────────────
async function renderTokens() {
  body.appendChild(heading('API Tokens'));
  if (store.user?.role !== 'admin') { body.appendChild(notice('Admin access required.')); return; }
  try {
    const tokens = await api.listTokens();
    if (tokens.length === 0) {
      body.appendChild(notice('No tokens yet. Create one for Claude sessions.'));
    } else {
      tokens.forEach(token => {
        const lastUsed = token.last_used_at
          ? new Date(token.last_used_at).toLocaleDateString('en-AU')
          : 'never';
        body.appendChild(settingsRow(
          token.label + '  ·  Last used: ' + lastUsed,
          btn('Revoke', async () => {
            if (!window.confirm('Revoke token "' + token.label + '"?')) return;
            try { await api.deleteToken(token.id); toastSuccess('Token revoked'); renderTokens(); }
            catch (err) { toastError(err.message); }
          }, true),
        ));
      });
    }
    body.appendChild(addBtn('+ Create token', async () => {
      const label = window.prompt('Token label (e.g. "Claude sessions"):');
      if (!label?.trim()) return;
      try {
        const result = await api.createToken({ label: label.trim() });
        // Token shown once — store in password manager
        window.alert('Token created. Copy it now — it will not be shown again:\n\n' + result.token);
        renderTokens();
      } catch (err) { toastError(err.message); }
    }));
  } catch (_) {
    body.appendChild(notice('Could not load tokens.'));
  }
}

// ── Account ───────────────────────────────────
function renderAccount() {
  body.appendChild(heading('Account'));

  const form = document.createElement('form');
  form.noValidate = true;

  function field(labelText, id, type, value, autocomplete) {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    wrap.style.marginBottom = '14px';
    const lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.className = 'label';
    lbl.textContent = labelText; // textContent — safe
    const input = document.createElement('input');
    input.type  = type;
    input.id    = id;
    input.name  = id;
    input.className = 'input';
    if (value)       input.value = value;
    if (autocomplete) input.autocomplete = autocomplete;
    wrap.appendChild(lbl);
    wrap.appendChild(input);
    form.appendChild(wrap);
    return input;
  }

  field('Display name',    'acc-display',  'text',     store.user?.display_name || '', 'name');
  field('New password',    'acc-password', 'password', '', 'new-password');
  field('Confirm password','acc-confirm',  'password', '', 'new-password');

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'btn btn--primary btn--sm';
  saveBtn.textContent = 'Save changes'; // textContent — safe
  form.appendChild(saveBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = form.querySelector('#acc-display').value.trim();
    const password    = form.querySelector('#acc-password').value;
    const confirm     = form.querySelector('#acc-confirm').value;
    if (password && password !== confirm) { toastError('Passwords do not match'); return; }
    const payload = {};
    if (displayName) payload.display_name = displayName;
    if (password)    payload.password     = password;
    if (!Object.keys(payload).length) return;
    saveBtn.disabled    = true;
    saveBtn.textContent = 'Saving…'; // textContent — safe
    try {
      await api.updateUser(store.user.id, payload);
      if (displayName) {
        store.user.display_name = displayName;
        const avatarEl = document.getElementById('avatar-initials');
        if (avatarEl) {
          const { initials } = await import('./utils.js');
          avatarEl.textContent = initials(displayName); // textContent — safe
        }
      }
      toastSuccess('Account updated');
    } catch (err) { toastError(err.message); }
    finally {
      saveBtn.disabled    = false;
      saveBtn.textContent = 'Save changes'; // textContent — safe
    }
  });

  body.appendChild(form);
}

// ── Danger Zone ───────────────────────────────
function renderDanger() {
  body.appendChild(heading('Danger Zone'));
  const warn = document.createElement('p');
  warn.style.cssText = 'font-size:13px;color:var(--text-2);margin-bottom:20px;';
  warn.textContent = 'These actions are permanent.'; // textContent — safe
  body.appendChild(warn);

  body.appendChild(settingsRow('Sign out of all sessions',
    btn('Sign out everywhere', async () => {
      try { await api.logout(); } finally { window.location.reload(); }
    }, true),
  ));

  if (store.user?.role === 'admin') {
    body.appendChild(settingsRow('Export all data as JSON',
      btn('Export', async () => {
        try {
          const data = await api.request('GET', '/api/admin/export');
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = 'kb-export-' + new Date().toISOString().slice(0, 10) + '.json';
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) { toastError('Export failed: ' + err.message); }
      }),
    ));
  }
}
