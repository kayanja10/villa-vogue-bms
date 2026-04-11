import axios from 'axios';

// ✅ FIXED: Use correct backend Render URL
const BASE = import.meta.env.VITE_API_URL || 'https://villa-vogue-bms-api.onrender.com/api';

const api = axios.create({
  baseURL: BASE,
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vv_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (
      err.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('refresh')
    ) {
      original._retry = true;

      try {
        const refresh = localStorage.getItem('vv_refresh');

        if (refresh) {
          const { data } = await axios.post(`${BASE}/auth/refresh`, {
            refreshToken: refresh
          });

          localStorage.setItem('vv_token', data.accessToken);

          if (data.refreshToken) {
            localStorage.setItem('vv_refresh', data.refreshToken);
          }

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
  login: (d) => api.post('/auth/login', d),
  verify2fa: (d) => api.post('/auth/verify-2fa', d),
  resendOtp: (d) => api.post('/auth/resend-otp', d),
  me: () => api.get('/auth/me'),
  changePassword: (d) => api.post('/auth/change-password', d),
};