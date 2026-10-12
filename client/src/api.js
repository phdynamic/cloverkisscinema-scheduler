const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json', ...options.headers } : options.headers,
  });
  if (res.status === 401) window.dispatchEvent(new Event('ckc:unauthorized'));
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed: ${res.status}`);
    err.code = body.code;
    err.status = res.status;
    throw err;
  }
  return body;
}

const json = (method, data) => ({ method, body: JSON.stringify(data ?? {}) });

// Session
export const getMe = () => request('/me');
export async function startLogin(handle) {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not start sign-in');
  return body.url;
}
export const logout = () => fetch('/auth/logout', { method: 'POST' });

// Posts
export const getPosts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/posts${qs ? `?${qs}` : ''}`);
};
export const getPostCounts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/posts/counts${qs ? `?${qs}` : ''}`);
};
export const getAuthors = () => request('/posts/authors');
export const getPost = (id) => request(`/posts/${id}`);
export const createPost = (data) => request('/posts', json('POST', data));
export const updatePost = (id, data) => request(`/posts/${id}`, json('PUT', data));
export const deletePost = (id) => request(`/posts/${id}`, { method: 'DELETE' });
// options: { postNow: true } or { scheduledAt: ISO string }
export const approvePost = (id, options = {}) => request(`/posts/${id}/approve`, json('POST', options));
export const rejectPost = (id, note) => request(`/posts/${id}/reject`, json('POST', { note }));

// Templates
export const getTemplates = () => request('/templates');
export const createTemplate = (data) => request('/templates', json('POST', data));
export const deleteTemplate = (id) => request(`/templates/${id}`, { method: 'DELETE' });

// Uploads
export async function uploadImages(files) {
  const formData = new FormData();
  files.forEach((f) => formData.append('images', f));
  const res = await fetch(`${BASE}/uploads`, { method: 'POST', body: formData });
  if (res.status === 401) window.dispatchEvent(new Event('ckc:unauthorized'));
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Upload failed');
  return body;
}

// Manager's office
export const getUsers = () => request('/admin/users');
export const addUser = (handle) => request('/admin/users', json('POST', { handle }));
export const removeUser = (id) => request(`/admin/users/${id}`, { method: 'DELETE' });
