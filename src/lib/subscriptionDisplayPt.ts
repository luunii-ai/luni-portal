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



/** Assinatura em uso (trial ou paga) — não exibe data de término por padrão. */

export function isActiveSubscriptionStatus(raw: string | undefined | null): boolean {

  const key = String(raw || '').trim().toLowerCase();

  return key === 'active' || key === 'trialing';

}



export function shouldShowTrialEnd(raw: string | undefined | null): boolean {

  return String(raw || '').trim().toLowerCase() === 'trialing';

}



/** Exibe fim do período pago (cancelada ou cancelamento agendado). */

export function shouldShowCurrentPeriodEnd(

  raw: string | undefined | null,

  cancelAtPeriodEnd?: boolean,

): boolean {

  const key = String(raw || '').trim().toLowerCase();

  if (key === 'canceled' || key === 'cancelled') return true;

  return cancelAtPeriodEnd === true;

}



export function subscriptionDateLabelPt(

  status: string | undefined | null,

  cancelAtPeriodEnd?: boolean,

): string {

  if (shouldShowTrialEnd(status)) return 'Seu teste termina em';

  if (shouldShowCurrentPeriodEnd(status, cancelAtPeriodEnd)) return 'Fim do período';

  return 'Fim do período';

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

export interface YearlyPlanSavings {
  savingsCents: number;
  savingsPercent: number;
  equivalentMonthlyCents: number;
  annualAtMonthlyRateCents: number;
}

/** Compara preço anual com 12× o mensal do mesmo produto. */
export function computeYearlyPlanSavings(
  yearlyUnitAmount: number | null,
  monthlyUnitAmount: number | null,
): YearlyPlanSavings | null {
  if (yearlyUnitAmount == null || monthlyUnitAmount == null) return null;
  const annualAtMonthlyRate = monthlyUnitAmount * 12;
  const savings = annualAtMonthlyRate - yearlyUnitAmount;
  if (savings <= 0) return null;
  return {
    savingsCents: savings,
    savingsPercent: Math.round((100 * savings) / annualAtMonthlyRate),
    equivalentMonthlyCents: Math.round(yearlyUnitAmount / 12),
    annualAtMonthlyRateCents: annualAtMonthlyRate,
  };
}


