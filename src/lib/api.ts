// Lightweight client for the PHP API. Same origin in production (served at /api);
// in dev, Vite proxies /api to the local PHP backend (see vite.config.ts).
export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "/api";

const TOKEN_KEY = "lovebag-admin-token";
const CUSTOMER_TOKEN_KEY = "lovebag-customer-token";

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

// Storefront customer session token (distinct from the admin token).
export const getCustomerToken = () => {
  try {
    return localStorage.getItem(CUSTOMER_TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setCustomerToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(CUSTOMER_TOKEN_KEY, t);
    else localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

type Opts = { method?: string; body?: unknown; auth?: boolean; customer?: boolean; signal?: AbortSignal };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.customer) {
    const t = getCustomerToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  } else if (opts.auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE}/${path.replace(/^\//, "")}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-json */
  }
  if (!res.ok || (json && json.ok === false)) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return (json?.data ?? json) as T;
}

export const apiGet = <T = any>(p: string, auth = false) => api<T>(p, { auth });
export const apiSend = <T = any>(method: string, p: string, body?: unknown, auth = true) =>
  api<T>(p, { method, body, auth });

// Customer-authenticated helpers (storefront account).
export const apiCustomerGet = <T = any>(p: string) => api<T>(p, { customer: true });
export const apiCustomer = <T = any>(method: string, p: string, body?: unknown) =>
  api<T>(p, { method, body, customer: true });

/** Multipart file upload (admin). Returns the stored media { id, url }. */
export async function apiUpload(file: File): Promise<{ id: number; url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const t = getToken();
  const res = await fetch(`${API_BASE}/admin/media/upload`, {
    method: "POST",
    headers: t ? { Authorization: `Bearer ${t}` } : {},
    body: fd,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) throw new Error(json?.error || "Upload failed");
  return json.data;
}
