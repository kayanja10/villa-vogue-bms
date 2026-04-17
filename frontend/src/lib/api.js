import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'https://villa-vogue-bms.onrender.com/api';

const api = axios.create({ baseURL: BASE, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vv_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && !original.url?.includes('refresh')) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('vv_refresh');
        if (refresh) {
          const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: refresh });
          localStorage.setItem('vv_token', data.accessToken);
          if (data.refreshToken) localStorage.setItem('vv_refresh', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        }
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const auth = {
  login:          (d) => api.post('/auth/login', d),
  // FIX: these URLs must match the backend routes in routes/auth.js exactly
  verify2fa:      (d) => api.post('/auth/2fa/verify', d),   // was '/auth/verify-2fa' — WRONG
  resendOtp:      (d) => api.post('/auth/2fa/resend', d),   // was '/auth/resend-otp'  — WRONG
  me:             ()  => api.get('/auth/me'),
  changePassword: (d) => api.post('/auth/change-password', d),
};

export const products = {
  list:        (p)    => api.get('/products', { params: p }),
  listPublic:  (p)    => api.get('/products/public', { params: p }),
  get:         (id)   => api.get(`/products/${id}`),
  create:      (d)    => api.post('/products', d),
  update:      (id,d) => api.put(`/products/${id}`, d),
  delete:      (id)   => api.delete(`/products/${id}`),
  adjustStock: (id,d) => api.post(`/products/${id}/adjust-stock`, d),
  lowStock:    ()     => api.get('/products/low-stock'),
};

export const orders = {
  list:         (p)       => api.get('/orders', { params: p }),
  get:          (id)      => api.get(`/orders/${id}`),
  create:       (d)       => api.post('/orders', d),
  updateStatus: (id,status) => api.put(`/orders/${id}/status`, { status }),
  delete:       (id)      => api.delete(`/orders/${id}`),
};

export const customers = {
  list:           (p)    => api.get('/customers', { params: p }),
  get:            (id)   => api.get(`/customers/${id}`),
  create:         (d)    => api.post('/customers', d),
  update:         (id,d) => api.put(`/customers/${id}`, d),
  delete:         (id)   => api.delete(`/customers/${id}`),
  birthdays:      ()     => api.get('/customers/birthdays-today'),
  portalLogin:    (d)    => api.post('/customers/portal/login', d),
  portalRegister: (d)    => api.post('/customers/portal/register', d),
};

export const analytics = {
  dashboard:          ()  => api.get('/analytics/dashboard'),
  salesReport:        (p) => api.get('/analytics/sales-report', { params: p }),
  categoryPerformance:(p) => api.get('/analytics/category-performance', { params: p }),
  staffPerformance:   (p) => api.get('/analytics/staff-performance', { params: p }),
  hourly:             (p) => api.get('/analytics/hourly', { params: p }),
  incomeExpense:      (p) => api.get('/analytics/income-expense', { params: p }),
  productPerformance: (p) => api.get('/analytics/product-performance', { params: p }),
  financialSummary:   (p) => api.get('/analytics/financial-summary', { params: p }),
};

export const inventory = {
  movements:  (p) => api.get('/inventory/movements', { params: p }),
  valuation:  ()  => api.get('/inventory/valuation'),
  deadStock:  (p) => api.get('/inventory/dead-stock', { params: p }),
};

export const expenses = {
  list:   (p)  => api.get('/expenses', { params: p }),
  create: (d)  => api.post('/expenses', d),
  delete: (id) => api.delete(`/expenses/${id}`),
};

export const categories = {
  list:   ()     => api.get('/categories'),
  create: (d)    => api.post('/categories', d),
  update: (id,d) => api.put(`/categories/${id}`, d),
  delete: (id)   => api.delete(`/categories/${id}`),
};

export const suppliers = {
  list:           ()     => api.get('/suppliers'),
  create:         (d)    => api.post('/suppliers', d),
  update:         (id,d) => api.put(`/suppliers/${id}`, d),
  delete:         (id)   => api.delete(`/suppliers/${id}`),
  transactions:   (id)   => api.get(`/suppliers/${id}/transactions`),
  addTransaction: (id,d) => api.post(`/suppliers/${id}/transactions`, d),
};

export const staff = {
  shifts:    (p) => api.get('/staff/shifts', { params: p }),
  clockIn:   ()  => api.post('/staff/clock-in'),
  clockOut:  ()  => api.post('/staff/clock-out'),
  targets:   ()  => api.get('/staff/targets'),
  setTarget: (d) => api.post('/staff/targets', d),
};

export const reports = {
  daily:    (p) => api.get('/reports/daily', { params: p }),
  monthly:  (p) => api.get('/reports/monthly-summary', { params: p }),
  cashFlow: (p) => api.get('/reports/cash-flow', { params: p }),
};

export const payments = {
  initiate: (d) => api.post('/payments/initiate', d),
  list:     ()  => api.get('/payments'),
};

export const settings = {
  get:    ()  => api.get('/settings'),
  update: (d) => api.put('/settings', d),
};

export const users = {
  list:          ()     => api.get('/users'),
  create:        (d)    => api.post('/users', d),
  update:        (id,d) => api.put(`/users/${id}`, d),
  delete:        (id)   => api.delete(`/users/${id}`),
  resetPassword: (id,d) => api.post(`/users/${id}/reset-password`, d),
  unlock:        (id)   => api.post(`/users/${id}/unlock`),
};

export const layaways = {
  list:       (p)    => api.get('/layaways', { params: p }),
  get:        (id)   => api.get(`/layaways/${id}`),
  create:     (d)    => api.post('/layaways', d),
  addPayment: (id,d) => api.post(`/layaways/${id}/payment`, d),
  cancel:     (id)   => api.post(`/layaways/${id}/cancel`),
};

export const debts = {
  list:   ()     => api.get('/debts'),
  create: (d)    => api.post('/debts', d),
  pay:    (id,d) => api.post(`/debts/${id}/pay`, d),
};

export const quotes = {
  list:         ()     => api.get('/quotes'),
  get:          (id)   => api.get(`/quotes/${id}`),
  create:       (d)    => api.post('/quotes', d),
  updateStatus: (id,d) => api.put(`/quotes/${id}/status`, d),
};

export const discounts = {
  list:     ()     => api.get('/discounts'),
  create:   (d)    => api.post('/discounts', d),
  validate: (d)    => api.post('/discounts/validate', d),
  use:      (d)    => api.post('/discounts/use', d),
  delete:   (id)   => api.delete(`/discounts/${id}`),
};

export const feedback = {
  // staff/admin (requires auth)
  list:   ()    => api.get('/feedback'),
  stats:  ()    => api.get('/feedback/stats'),
  create: (d)   => api.post('/feedback', d),
  delete: (id)  => api.delete(`/feedback/${id}`),

  // public (no auth — used by CustomerPortal)
  publicList:   ()  => api.get('/feedback/public'),
  publicStats:  ()  => api.get('/feedback/public-stats'),
  publicCreate: (d) => api.post('/feedback/public', d),
};

export const cashFloat = {
  today:   ()  => api.get('/cash-float/today'),
  history: ()  => api.get('/cash-float/history'),
  open:    (d) => api.post('/cash-float/open', d),
  close:   (d) => api.post('/cash-float/close', d),
};

export const purchaseOrders = {
  list:         ()     => api.get('/purchase-orders'),
  create:       (d)    => api.post('/purchase-orders', d),
  receive:      (id)   => api.post(`/purchase-orders/${id}/receive`),
  updateStatus: (id,d) => api.put(`/purchase-orders/${id}/status`, d),
};

export const uploads = {
  image: async (file) => {
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/uploads/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res;
    } catch {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ data: { url: reader.result, publicId: null, fallback: true } });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  },
};

export const activity = {
  list: (p) => api.get('/activity', { params: p }),
};

export const ai = {
  insights: (d) => api.post('/ai/insights', d),
  summary:  ()  => api.get('/ai/summary'),
  forecast: ()  => api.get('/ai/forecast'),
};

export const cashbook = {
  list:               (p) => api.get('/cashbook', { params: p }),
  create:             (d) => api.post('/cashbook', d),
  reconciliation:     (p) => api.get('/cashbook/reconciliation', { params: p }),
  submitReconciliation:(d)=> api.post('/cashbook/reconciliation', d),
};

export const notifications = {
  list:        ()    => api.get('/notifications'),
  markRead:    (id)  => api.put(`/notifications/${id}/read`),
  markAllRead: ()    => api.put('/notifications/mark-all-read'),
  checkStock:  ()    => api.post('/notifications/check-stock'),
};

export const sessions = {
  start:       ()          => api.post('/sessions/start', {}),
  heartbeat:   (sessionId) => api.post('/sessions/heartbeat', { sessionId }),
  end:         (sessionId) => api.post('/sessions/end', { sessionId }),
  list:        ()          => api.get('/sessions'),
  forceLogout: (sessionId) => api.post(`/sessions/${sessionId}/force-logout`),
  audit:       (p)         => api.get('/sessions/audit', { params: p }),
  config:      ()          => api.get('/sessions/config'),
};
