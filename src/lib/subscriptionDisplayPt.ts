/**
 * Rótulos em português para valores crus da API Stripe / backend (status, intervalos).
 */

const STRIPE_SUBSCRIPTION_STATUS_PT: Record<string, string> = {
  none: 'Sem assinatura',
  incomplete: 'Incompleta',
  incomplete_expired: 'Expirada (incompleta)',
  trialing: 'Período de teste',
  active: 'Ativa',
  past_due: 'Pagamento em atraso',
  canceled: 'Cancelada',
  cancelled: 'Cancelada',
  unpaid: 'Inadimplente',
  paused: 'Pausada',
};

export function subscriptionStatusLabelPt(raw: string | undefined | null): string {
  const key = String(raw || '').trim().toLowerCase();
  if (!key) return '—';
  return STRIPE_SUBSCRIPTION_STATUS_PT[key] ?? raw;
}

const INTERVAL_WORDS: Record<string, { one: string; many: string }> = {
  day: { one: 'dia', many: 'dias' },
  week: { one: 'semana', many: 'semanas' },
  month: { one: 'mês', many: 'meses' },
  year: { one: 'ano', many: 'anos' },
};

/** Ex.: "mês", "3 meses" — para exibir ao lado do valor (ex.: R$ 197 / mês). */
export function recurringBillingLabelPt(
  interval: string | null | undefined,
  intervalCount: number | null | undefined,
): string {
  const i = String(interval || '').trim().toLowerCase();
  if (!i) return '';
  const words = INTERVAL_WORDS[i];
  const n = Number(intervalCount);
  const count = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  if (!words) return interval || '';
  if (count === 1) return words.one;
  return `${count} ${words.many}`;
}
