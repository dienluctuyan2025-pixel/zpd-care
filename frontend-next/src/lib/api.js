import axios from 'axios';

function resolveApiUrl() {
  const envUrl =
    typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
      ? String(process.env.NEXT_PUBLIC_API_URL).replace(/\/$/, '')
      : '';
  if (envUrl) return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    const proto = window.location.protocol === 'https:' ? 'https' : 'http';
    // Dev: backend :8000; reverse-proxy có thể set NEXT_PUBLIC_API_URL
    return `${proto}://${host}:8000/api`;
  }
  return 'http://localhost:8000/api';
}

export const API_URL = resolveApiUrl();

const TOKEN_KEY = 'zpd_token';
const USER_KEY = 'zpd_user';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== 'undefined') {
      // Keep login page from looping; only clear if we had a token
      if (getToken()) {
        clearSession();
        window.dispatchEvent(new Event('zpd-auth-expired'));
      }
    }
    return Promise.reject(err);
  }
);

export async function loginRequest(username, password) {
  const res = await axios.post(`${API_URL}/auth/login`, { username, password });
  setSession(res.data.access_token, res.data.user);
  return res.data;
}
