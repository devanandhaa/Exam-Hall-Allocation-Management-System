// All communication with MySQL goes through these helpers (-> server/index.js)
const call = async (url, method = 'GET', body) => {
  const res = await fetch('/api' + url, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Server error. Is the API running?');
  return data;
};
export const api = {
  get: (u) => call(u),
  post: (u, b) => call(u, 'POST', b),
  put: (u, b) => call(u, 'PUT', b),
  del: (u) => call(u, 'DELETE'),
};
// Build "?a=1&b=2" while skipping empty values
export const qs = (o = {}) => {
  const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== ''));
  return p.toString() ? '?' + p : '';
};
export const t5 = (v) => (v ? String(v).slice(0, 5) : '');
export const fd = (v) => v ? new Date(v + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
export const range = (r) => `${t5(r.start_time)} - ${t5(r.end_time)}`;
