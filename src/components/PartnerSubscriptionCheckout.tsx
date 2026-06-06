import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import type { StripeEmbeddedCheckout } from '@stripe/stripe-js';
import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAppApiBaseUrl } from '@/controllers/appApiClient';
import {
  createCheckoutOfficialSession,
  fetchSubscriptionPlans,
  type SubscriptionPlanDto,
} from '@/controllers/subscriptionApi';
import { getApiErrorMessage } from '@/controllers/apiErrors';
import { computeYearlyPlanSavings, recurringBillingLabelPt } from '@/lib/subscriptionDisplayPt';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const POLL_MS = 3000;

/** Alinhado à landing Luni — Profissional indisponível até definição final. */
const FEATURES_STARTER = [
  'Simulador de preços',
  '40 simulações com IA/mês',
  'Gestão de pacientes',
  '1 profissional',
] as const;

const FEATURES_PRO = [
  'Todas as funcionalidades Starter',
  '100 simulações com IA/mês',
  'Até 3 profissionais',
  'IA avançada de simulação',
  'IA para automações de marketing',
] as const;

function normalizePlanText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesPlanName(value: string, terms: string[]): boolean {
  const normalized = normalizePlanText(value);
  return terms.some((term) => normalized.includes(normalizePlanText(term)));
}

/** Em produção o Pro fica “em breve”; em Stripe Test (pk_test_) permite testar o checkout local. */
function isStripeTestPublishableKey(): boolean {
  return publishableKey.startsWith('pk_test_');
}

function isProPlanUnavailable(plan: SubscriptionPlanDto): boolean {
  if (import.meta.env.VITE_SUBSCRIPTION_UNLOCK_ALL_PLANS === 'true') return false;
  if (isStripeTestPublishableKey()) return false;
  return matchesPlanName(plan.productName, ['pro', 'profissional']);
}

function planMarketing(plan: SubscriptionPlanDto): { blurb: string; features: readonly string[] } {
  if (isProPlanUnavailable(plan)) {
    return {
      blurb: 'Para clínicas que querem maximizar conversões.',
      features: FEATURES_PRO,
    };
  }
  if (matchesPlanName(plan.productName, ['starter', 'basico', 'básico'])) {
    return {
      blurb: 'Ideal para clínicas que estão começando com simulações.',
      features: FEATURES_STARTER,
    };
  }
  return {
    blurb: 'Inclui simulações com IA, simulador de preços e gestão de pacientes.',
    features: FEATURES_STARTER,
  };
}

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() || '';

function formatPlanMoney(amountCents: number | null, currency: string | null): string {
  if (!Number.isFinite(amountCents as number)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: (currency || 'BRL').toUpperCase(),
  }).format((amountCents || 0) / 100);
}

function planIntervalSortKey(plan: SubscriptionPlanDto): number {
  if (plan.interval === 'month') return 0;
  if (plan.interval === 'year') return 1;
  return 2;
}

function sortPlansForDisplay(plans: SubscriptionPlanDto[]): SubscriptionPlanDto[] {
  return [...plans].sort((a, b) => {
    const nameCmp = normalizePlanText(a.productName).localeCompare(normalizePlanText(b.productName), 'pt-BR');
    if (nameCmp !== 0) return nameCmp;
    return planIntervalSortKey(a) - planIntervalSortKey(b);
  });
}

function monthlyPlanForProduct(
  plans: SubscriptionPlanDto[],
  plan: SubscriptionPlanDto,
): SubscriptionPlanDto | undefined {
  const key = normalizePlanText(plan.productName);
  return plans.find(
    (p) =>
      p.interval === 'month' &&
      !isProPlanUnavailable(p) &&
      normalizePlanText(p.productName) === key,
  );
}

type PartnerSubscriptionCheckoutProps = {
  onProvisioned?: () => void;
};

export function PartnerSubscriptionCheckout({ onProvisioned }: PartnerSubscriptionCheckoutProps) {
  const { refreshMe } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPriceId, setSelectedPriceId] = useState('');
  const [promotionCode, setPromotionCode] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [provisionPhase, setProvisionPhase] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');

  const mountRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<StripeEmbeddedCheckout | null>(null);

  const destroyCheckout = useCallback(() => {
    const c = checkoutRef.current;
    checkoutRef.current = null;
    if (c && typeof c.destroy === 'function') {
      c.destroy();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchSubscriptionPlans()
      .then((p) => {
        if (cancelled) return;
        setPlans(p);
        const firstAvailable = p.find((pl) => !isProPlanUnavailable(pl));
        if (firstAvailable?.id) setSelectedPriceId(firstAvailable.id);
        else if (p[0]?.id) setSelectedPriceId(p[0].id);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar os planos.');
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    setProvisionPhase('pending');
    let stopped = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const res = await fetch(
          `${getAppApiBaseUrl()}/api/subscriptions/checkout-session/provisioned?session_id=${encodeURIComponent(sessionId)}`,
        );
        if (!res.ok || stopped) return;
        const data = (await res.json().catch(() => ({}))) as {
          provisioned?: boolean;
          phase?: string;
        };
        if (data.provisioned === true) {
          if (intervalId) clearInterval(intervalId);
          stopped = true;
          setProvisionPhase('done');
          await refreshMe();
          onProvisioned?.();
          setSearchParams({}, { replace: true });
          return;
        }
        if (data.phase === 'invalid_session') {
          if (intervalId) clearInterval(intervalId);
          stopped = true;
          setProvisionPhase('error');
        }
      } catch {
        /* retry */
      }
    };

    intervalId = setInterval(poll, POLL_MS);
    void poll();

    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [sessionId, refreshMe, setSearchParams, onProvisioned]);

  useLayoutEffect(() => {
    if (!clientSecret || !publishableKey || !mountRef.current) return;

    let cancelled = false;

    void (async () => {
      const stripe = await loadStripe(publishableKey);
      if (!stripe || cancelled || !mountRef.current) return;

      destroyCheckout();
      const el = mountRef.current;
      el.innerHTML = '';

      const checkout = await stripe.createEmbeddedCheckoutPage({ clientSecret });
      if (cancelled || !mountRef.current) {
        checkout.destroy();
        return;
      }
      checkoutRef.current = checkout;
      checkout.mount(el);
    })();

    return () => {
      cancelled = true;
      destroyCheckout();
    };
  }, [clientSecret, destroyCheckout]);

  const handleStartCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!publishableKey) {
      setError('Configure VITE_STRIPE_PUBLISHABLE_KEY no ambiente do app de gestão.');
      return;
    }
    if (!selectedPriceId) {
      setError('Selecione um plano.');
      return;
    }
    const chosen = plans.find((pl) => pl.id === selectedPriceId);
    if (chosen && isProPlanUnavailable(chosen)) {
      setError('O plano Profissional ainda não está disponível para contratação.');
      return;
    }
    setCheckoutLoading(true);
    setClientSecret(null);
    destroyCheckout();
    try {
      const result = await createCheckoutOfficialSession({
        priceId: selectedPriceId,
        checkoutUi: 'embedded',
        promotionCode: promotionCode.trim() || undefined,
      });
      if ('clientSecret' in result && result.clientSecret) {
        setClientSecret(result.clientSecret);
      } else {
        setError('Resposta inesperada do servidor.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível iniciar o pagamento.'));
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (sessionId && provisionPhase === 'pending') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Confirmando sua assinatura com o sistema… Isso costuma levar poucos segundos.
        </p>
      </div>
    );
  }

  if (sessionId && provisionPhase === 'error') {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        Não foi possível confirmar a sessão de pagamento. Tente novamente ou fale com o suporte.
        <Button type="button" variant="outline" className="mt-4" onClick={() => setSearchParams({}, { replace: true })}>
          Voltar
        </Button>
      </div>
    );
  }

  const showEmbed = Boolean(clientSecret);

  return (
    <div className="space-y-6 rounded-xl bg-card p-6 shadow-card">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Contratar plano</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha o plano e conclua o pagamento no Stripe (sem período de teste). Você pode usar um cupom na etapa de
          pagamento ou informar o código abaixo.
        </p>
      </div>

      {error ? <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</div> : null}

      {!showEmbed ? (
        <form onSubmit={(ev) => void handleStartCheckout(ev)} className="space-y-6">
          <div className="space-y-3">
            {plansLoading ? (
              <p className="text-sm text-muted-foreground">Carregando planos…</p>
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum plano disponível no momento.</p>
            ) : (
              sortPlansForDisplay(plans).map((plan) => {
                const amount = formatPlanMoney(plan.unitAmount, plan.currency);
                const intervalLabel = recurringBillingLabelPt(plan.interval, plan.intervalCount ?? 1);
                const suffix = intervalLabel ? ` / ${intervalLabel}` : '';
                const locked = isProPlanUnavailable(plan);
                const { blurb, features } = planMarketing(plan);
                const selected = !locked && selectedPriceId === plan.id;
                const isYearly = plan.interval === 'year';
                const monthlyPair = isYearly ? monthlyPlanForProduct(plans, plan) : undefined;
                const yearlySavings = isYearly
                  ? computeYearlyPlanSavings(plan.unitAmount, monthlyPair?.unitAmount ?? null)
                  : null;
                return (
                  <label
                    key={plan.id}
                    className={cn(
                      'relative flex items-start gap-3 rounded-lg border p-4 transition-colors',
                      locked
                        ? 'cursor-not-allowed border-border bg-gradient-to-b from-muted/60 to-muted/30 text-muted-foreground select-none'
                        : selected
                          ? 'cursor-pointer border-primary bg-primary/5'
                          : 'cursor-pointer border-border',
                      !locked && isYearly && yearlySavings && 'border-primary/25 bg-primary/[0.02]',
                    )}
                  >
                    {locked ? (
                      <span className="absolute -top-2.5 right-3 inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm">
                        Em breve
                      </span>
                    ) : null}
                    {!locked && yearlySavings ? (
                      <span className="absolute -top-2.5 right-3">
                        <Badge className="text-[10px] font-bold uppercase tracking-wider shadow-sm">
                          Economize {yearlySavings.savingsPercent}%
                        </Badge>
                      </span>
                    ) : null}
                    <input
                      type="radio"
                      name="plan"
                      className={cn('mt-1 shrink-0', locked && 'pointer-events-none opacity-45')}
                      disabled={locked}
                      checked={!locked && selectedPriceId === plan.id}
                      onChange={() => {
                        if (!locked) setSelectedPriceId(plan.id);
                      }}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p
                          className={cn(
                            'font-medium capitalize',
                            locked ? 'text-foreground/80' : 'text-foreground',
                          )}
                        >
                          {plan.productName}
                        </p>
                        <div className="space-y-1">
                          {yearlySavings && monthlyPair ? (
                            <>
                              <p className="text-xs text-muted-foreground line-through">
                                {formatPlanMoney(yearlySavings.annualAtMonthlyRateCents, plan.currency)}
                                {suffix ? ` (${formatPlanMoney(monthlyPair.unitAmount, plan.currency)} × 12)` : ''}
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {amount}
                                {suffix}
                              </p>
                              <p className="text-sm font-medium text-primary">
                                Equivale a{' '}
                                {formatPlanMoney(yearlySavings.equivalentMonthlyCents, plan.currency)}
                                {' '}/ mês
                              </p>
                              <p className="text-xs font-medium text-primary">
                                Economia de{' '}
                                {formatPlanMoney(yearlySavings.savingsCents, plan.currency)} em relação ao
                                plano mensal
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {amount}
                              {suffix}
                            </p>
                          )}
                        </div>
                        <p className={cn('mt-1.5 text-sm leading-snug', locked && 'text-muted-foreground')}>
                          {blurb}
                        </p>
                      </div>
                      <ul className="space-y-1.5 border-t border-border/60 pt-2">
                        {features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-xs leading-snug">
                            <Check
                              className={cn(
                                'mt-0.5 h-3.5 w-3.5 shrink-0',
                                locked ? 'text-muted-foreground/80' : 'text-primary',
                              )}
                              strokeWidth={2}
                              aria-hidden
                            />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="partner-promo">Cupom (opcional)</Label>
            <Input
              id="partner-promo"
              value={promotionCode}
              onChange={(ev) => setPromotionCode(ev.target.value)}
              placeholder="Código promocional"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Se deixar em branco, você poderá informar o cupom na tela do Stripe.
            </p>
          </div>

          <Button
            type="submit"
            disabled={
              plansLoading ||
              checkoutLoading ||
              !plans.length ||
              !plans.some((p) => !isProPlanUnavailable(p))
            }
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparando…
              </>
            ) : (
              'Continuar para pagamento'
            )}
          </Button>
        </form>
      ) : null}

      {showEmbed ? (
        <div
          ref={mountRef}
          className="min-h-[480px] w-full rounded-xl border border-border bg-muted/20 p-2"
          aria-live="polite"
        />
      ) : null}
    </div>
  );
}
