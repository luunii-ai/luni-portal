import axios from 'axios';

const TOKEN_KEY = 'beleza_estrategica_app_token';

export function getAppApiBaseUrl(): string {
  const raw = import.meta.env.VITE_APP_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'http://localhost:3001';
}

export const appApiClient = axios.create({
  baseURL: `${getAppApiBaseUrl()}/api`,
});

appApiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (
      err?.response?.status === 403 &&
      (err?.response?.data?.code === 'PARTNER_TEST_LOCKED' ||
        err?.response?.data?.code === 'PAYMENT_OVERDUE' ||
        err?.response?.data?.code === 'SUBSCRIPTION_CANCELED')
    ) {
      const path = window.location.pathname || '';
      if (!path.startsWith('/configuracoes')) {
        window.location.assign('/configuracoes/assinatura');
      }
    }
    return Promise.reject(err);
  },
);

appApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAppAuthToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAppAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
