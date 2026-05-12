/**
 * Lightweight API client for NagoWeb.
 *
 * - Automatically attaches the Bearer access token from localStorage.
 * - On 401 responses, attempts a silent token refresh once.
 * - Throws a structured ApiError so callers can inspect status + message.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Storage helpers ────────────────────────────────────────────────────────────

export const storage = {
  getAccessToken:  () => localStorage.getItem('nw_access_token'),
  getRefreshToken: () => localStorage.getItem('nw_refresh_token'),
  setTokens(access, refresh) {
    localStorage.setItem('nw_access_token', access);
    if (refresh) localStorage.setItem('nw_refresh_token', refresh);
  },
  clearTokens() {
    localStorage.removeItem('nw_access_token');
    localStorage.removeItem('nw_refresh_token');
    localStorage.removeItem('nw_user');
  },
  getUser:  () => {
    try { return JSON.parse(localStorage.getItem('nw_user') || 'null'); }
    catch { return null; }
  },
  setUser: (user) => localStorage.setItem('nw_user', JSON.stringify(user)),
};

// ── Error class ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.name    = 'ApiError';
    this.status  = status;
    this.errors  = errors; // express-validator field errors
  }
}

// ── Token refresh (called once on 401) ────────────────────────────────────────

let refreshPromise = null; // deduplicate concurrent refresh calls

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = storage.getRefreshToken();
    if (!refreshToken) throw new ApiError('No refresh token', 401);

    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
    });

    const data = await res.json();
    if (!res.ok) throw new ApiError(data.message || 'Session expired', res.status);

    storage.setTokens(data.data.accessToken, null);
    return data.data.accessToken;
  })().finally(() => { refreshPromise = null; });

  return refreshPromise;
}

// ── Core fetch wrapper ─────────────────────────────────────────────────────────

async function request(path, options = {}, retry = true) {
  const { body, headers: extraHeaders = {}, ...rest } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const token = storage.getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Silent token refresh on first 401
  if (res.status === 401 && retry) {
    try {
      await refreshAccessToken();
      return request(path, options, false); // retry once
    } catch {
      storage.clearTokens();
      window.dispatchEvent(new Event('nw:logout'));
      throw new ApiError('Session expired. Please log in again.', 401);
    }
  }

  // Parse JSON (even for error responses)
  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = { message: await res.text() };
  }

  if (!res.ok) {
    throw new ApiError(
      data.message || `Request failed (${res.status})`,
      res.status,
      data.errors || []
    );
  }

  return data;
}

// ── Public API surface ─────────────────────────────────────────────────────────

export const api = {
  get:    (path, opts)  => request(path, { method: 'GET',    ...opts }),
  post:   (path, body, opts) => request(path, { method: 'POST',   body, ...opts }),
  put:    (path, body, opts) => request(path, { method: 'PUT',    body, ...opts }),
  patch:  (path, body, opts) => request(path, { method: 'PATCH',  body, ...opts }),
  delete: (path, opts)  => request(path, { method: 'DELETE', ...opts }),
};

// ── Auth-specific helpers ──────────────────────────────────────────────────────

export const authApi = {
  register: (data)  => api.post('/api/auth/register', data),
  login:    (data)  => api.post('/api/auth/login',    data),
  logout:   (refreshToken) => api.post('/api/auth/logout', { refreshToken }),
  me:       ()      => api.get('/api/auth/me'),
  refresh:  (refreshToken) => api.post('/api/auth/refresh', { refreshToken }),
  changePassword: (data) => api.put('/api/auth/change-password', data),
};

// ── Projects API helpers ───────────────────────────────────────────────────────

export const projectsApi = {
  /** List projects with all filter/sort/pagination params */
  list: (params = {}) => api.get(`/api/projects?${new URLSearchParams(
    // Strip undefined/empty values before serialising
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null))
  )}`),

  /** Get all distinct filter options (categories, vendors, price range) */
  getFilterMeta: () => api.get('/api/projects/filter-meta'),

  /** Quick autocomplete search */
  search: (q) => api.get(`/api/projects/search?q=${encodeURIComponent(q)}`),

  /** Single project detail */
  getOne: (id) => api.get(`/api/projects/${id}`),
};

// ── User profile & wishlist helpers ───────────────────────────────────────────

export const userApi = {
  getProfile:          ()           => api.get('/api/users/profile'),
  updateProfile:       (data)       => api.put('/api/users/profile', data),
  getWishlist:         ()           => api.get('/api/users/wishlist'),
  removeFromWishlist:  (projectId)  => api.delete(`/api/users/wishlist/${projectId}`),

  /** Upload avatar — multipart/form-data */
  uploadAvatar: async (formData) => {
    const token = localStorage.getItem('nw_access_token');
    const res = await fetch(`${BASE_URL}/api/users/avatar`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    formData,
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.message || 'Upload failed'), { status: res.status });
    return data;
  },
};

// ── Download token helpers (buyer-facing) ──────────────────────────────────────

export const downloadApi = {
  requestToken:  (projectId)  => api.post(`/api/downloads/token/${projectId}`, {}),
  listMyTokens:  ()           => api.get('/api/downloads/my-tokens'),
  getHistory:    ()           => api.get('/api/downloads/history'),
  revokeToken:   (tokenId)    => api.delete(`/api/downloads/token/${tokenId}`),
  fileUrl:       (token)      => `${BASE_URL}/api/downloads/file?token=${token}`,
};

// ── Order helpers (buyer-facing) ───────────────────────────────────────────────

export const ordersApi = {
  listOrders: ()          => api.get('/api/payments/orders'),
  getOrder:   (orderId)   => api.get(`/api/payments/orders/${orderId}`),
};

export const manualPaymentApi = {
  getSettings:     ()                    => api.get('/api/payments/manual/settings'),
  initiateOrder:   (data)                => api.post('/api/payments/manual/initiate', data),
  listMyProofs:    ()                    => api.get('/api/payments/manual/my-proofs'),

  /** Upload screenshot — multipart/form-data */
  uploadProof: async (orderId, formData) => {
    const token = localStorage.getItem('nw_access_token');
    const res = await fetch(`${BASE_URL}/api/payments/manual/${orderId}/proof`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    formData,
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.message || 'Upload failed'), { status: res.status });
    return data;
  },
};

// ── Admin API helpers ──────────────────────────────────────────────────────────

export const adminApi = {
  // Analytics
  getAnalytics: () => api.get('/api/admin/analytics'),

  // Users
  listUsers:        (params = {}) => api.get(`/api/admin/users?${new URLSearchParams(params)}`),
  getUser:          (id)          => api.get(`/api/admin/users/${id}`),
  toggleUserStatus: (id)          => api.patch(`/api/admin/users/${id}/status`, {}),
  changeUserRole:   (id, role)    => api.patch(`/api/admin/users/${id}/role`, { role }),

  // Projects
  listProjects:          (params = {}) => api.get(`/api/admin/projects?${new URLSearchParams(params)}`),
  toggleProjectPublish:  (id)          => api.patch(`/api/admin/projects/${id}/publish`, {}),
  toggleProjectFeature:  (id)          => api.patch(`/api/admin/projects/${id}/feature`, {}),
  deleteProject:         (id)          => api.delete(`/api/admin/projects/${id}`),

  // Orders
  listOrders: (params = {}) => api.get(`/api/admin/orders?${new URLSearchParams(params)}`),
  getOrder:   (id)          => api.get(`/api/admin/orders/${id}`),
  refundOrder:(id)          => api.patch(`/api/admin/orders/${id}/refund`, {}),

  // Files
  listFiles:  (params = {}) => api.get(`/api/admin/files?${new URLSearchParams(params)}`),
  deleteFile: (projectId)   => api.delete(`/api/admin/files/${projectId}`),

  // Reviews
  listReviews:           (params = {}) => api.get(`/api/admin/reviews?${new URLSearchParams(params)}`),
  toggleReviewVisibility:(id)          => api.patch(`/api/admin/reviews/${id}/hide`, {}),

  // Uploads (project_files table)
  getUploadStats:     ()              => api.get('/api/admin/uploads/stats'),
  listProjectFiles:   (projectId)     => api.get(`/api/admin/uploads/${projectId}`),
  updateFileMeta:     (fileId, data)  => api.patch(`/api/admin/uploads/files/${fileId}`, data),
  deleteProjectFile:  (fileId)        => api.delete(`/api/admin/uploads/files/${fileId}`),

  /**
   * Upload a single file to a project.
   * Uses raw fetch (not the JSON wrapper) because it's multipart/form-data.
   */
  uploadFile: async (projectId, formData) => {
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const token    = localStorage.getItem('nw_access_token');
    const res = await fetch(`${BASE_URL}/api/admin/uploads/${projectId}`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    formData,
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.message || 'Upload failed'), { status: res.status, errors: data.errors || [] });
    return data;
  },

  /**
   * Upload multiple files to a project in one request.
   */
  uploadFilesBulk: async (projectId, formData) => {
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const token    = localStorage.getItem('nw_access_token');
    const res = await fetch(`${BASE_URL}/api/admin/uploads/${projectId}/bulk`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    formData,
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.message || 'Upload failed'), { status: res.status, errors: data.errors || [] });
    return data;
  },

  // Manual Payment Verification
  listManualPayments:   (params = {}) => api.get(`/api/admin/manual-payments?${new URLSearchParams(params)}`),
  getManualPayment:     (id)          => api.get(`/api/admin/manual-payments/${id}`),
  approveManualPayment: (id, note)    => api.patch(`/api/admin/manual-payments/${id}/approve`, { note }),
  rejectManualPayment:  (id, note)    => api.patch(`/api/admin/manual-payments/${id}/reject`,  { note }),
  getManualPaymentSettings:           () => api.get('/api/admin/manual-payments/settings'),
  updateManualPaymentSettings: (method, data) => api.put(`/api/admin/manual-payments/settings/${method}`, data),
  screenshotUrl: (id) => `${BASE_URL}/api/admin/manual-payments/${id}/screenshot`,
};
