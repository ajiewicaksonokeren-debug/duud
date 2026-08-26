import axios from 'axios';

// In the browser (web dev/prod) this stays relative and goes through the
// Vite proxy or same-origin deployment. In the packaged Android app there is
// no same origin to proxy to, so VITE_API_URL must point at the deployed
// backend, e.g. https://tebak-gambar-server.onrender.com
const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tg_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { API_BASE };
export default api;
