import axios from 'axios';

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    if (err.response?.status === 401) return 'Sessão expirada ou credenciais inválidas.';
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
