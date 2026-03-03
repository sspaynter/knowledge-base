// api.js — Central API client. All fetch() calls go through here only.
// Deviations from plan: corrected routes to match actual backend implementation.

const BASE = '';

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body !== null) opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);

  if (res.status === 401) {
    import('./auth.js').then(m => m.showAuthOverlay());
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Expose request for ad-hoc calls (e.g. settings)
export { request };

// Auth — Google OAuth via /auth routes
export async function getMe() {
  const data = await request('GET', '/auth/me');
  if (!data.authenticated) throw new Error('Unauthorized');
  return data.user;
}

export const logout = () => request('POST', '/auth/logout');

// Workspaces
export const listWorkspaces  = ()         => request('GET',    '/api/workspaces');
export const createWorkspace = (body)     => request('POST',   '/api/workspaces',        body);
export const updateWorkspace = (id, body) => request('PATCH',  `/api/workspaces/${id}`,  body);
export const deleteWorkspace = (id)       => request('DELETE', `/api/workspaces/${id}`);

// Sections — Note: actual backend routes differ from plan
// GET  /api/workspaces/:id/sections
// POST /api/workspaces/:id/sections  (wsId required in path)
// PATCH  /api/workspaces/sections/:id
// DELETE /api/workspaces/sections/:id
export const listSections  = (wsId)       => request('GET',    `/api/workspaces/${wsId}/sections`);
export const createSection = (wsId, body) => request('POST',   `/api/workspaces/${wsId}/sections`, body);
export const updateSection = (id, body)   => request('PATCH',  `/api/workspaces/sections/${id}`,   body);
export const deleteSection = (id)         => request('DELETE', `/api/workspaces/sections/${id}`);

// Pages — Note: list route is GET /api/pages/section/:sectionId (not /api/sections/:id/pages)
export const listPages  = (sectionId)  => request('GET',    `/api/pages/section/${sectionId}`);
export const getPage    = (id)         => request('GET',    `/api/pages/${id}`);
export const createPage = (body)       => request('POST',   '/api/pages',         body);
export const updatePage = (id, body)   => request('PATCH',  `/api/pages/${id}`,   body);
export const deletePage = (id)         => request('DELETE', `/api/pages/${id}`);
export const movePage   = (id, body)   => request('PATCH',  `/api/pages/${id}/move`, body);

// Assets
export const listAssets  = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/api/assets${qs ? '?' + qs : ''}`);
};
export const getAsset    = (id)        => request('GET',   `/api/assets/${id}`);
export const createAsset = (body)      => request('POST',  '/api/assets',        body);
export const updateAsset = (id, body)  => request('PATCH', `/api/assets/${id}`,  body);
export const linkAsset   = (id, body)  => request('POST',  `/api/assets/${id}/link`, body);

// File upload (multipart — bypasses JSON wrapper)
export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

// Search
export const search = (q, params = {}) => {
  const qs = new URLSearchParams({ q, ...params }).toString();
  return request('GET', `/api/search?${qs}`);
};

// Relationships
export const listRelationships  = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/api/relationships${qs ? '?' + qs : ''}`);
};
export const createRelationship = (body) => request('POST',   '/api/relationships',      body);
export const deleteRelationship = (id)   => request('DELETE', `/api/relationships/${id}`);

// Note: /api/assets/:id/relationships does not exist in backend;
// use listRelationships({ from_asset_id: id }) instead
export const listAssetRelationships = (id) =>
  listRelationships({ from_asset_id: id });

// Get pages that reference a given asset
export const getAssetLinkedPages = (id) => request('GET', `/api/assets/${id}/pages`);

// Inbox — quick-capture
export const captureInbox = (body) => request('POST', '/api/inbox', body);

// Admin
export const listUsers   = ()         => request('GET',    '/api/admin/users');
export const updateUser  = (id, body) => request('PATCH',  `/api/admin/users/${id}`, body);
export const deleteUser  = (id)       => request('DELETE', `/api/admin/users/${id}`);
export const listTokens  = ()         => request('GET',    '/api/admin/tokens');
export const createToken = (body)     => request('POST',   '/api/admin/tokens',      body);
export const deleteToken = (id)       => request('DELETE', `/api/admin/tokens/${id}`);
export const getSettings    = ()          => request('GET',   '/api/admin/settings');
export const updateSettings = (body)      => request('PATCH', '/api/admin/settings', body);
