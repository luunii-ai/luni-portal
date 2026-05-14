import { useEffect, useMemo, useState } from 'react';
import { CreditCard, ExternalLink, RefreshCcw } from 'lucide-react';
import { createBillingPortalSession, fetchCurrentSubscription } from '@/controllers/subscriptionApi';
import { getApiErrorMessage } from '@/controllers/apiErrors';
import { recurringBillingLabelPt, subscriptionStatusLabelPt } from '@/lib/subscriptionDisplayPt';
import { useAuth } from '@/contexts/AuthContext';
import { PartnerSubscriptionCheckout } from '@/components/PartnerSubscriptionCheckout';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR');
}

function formatMoney(amountCents: number | null, currency: string | null): string {
  if (!Number.isFinite(amountCents as number)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: (currency || 'BRL').toUpperCase(),
  }).format((amountCents || 0) / 100);
}

const SubscriptionSettings = () => {
  const { user } = useAuth();
  const isPartner = user?.accountType === 'partner_test';
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof fetchCurrentSubscription>> | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const current = await fetchCurrentSubscription();
      setSubscription(current);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível carregar a assinatura.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const planDescription = useMemo(() => {
    if (!subscription?.currentPrice) return 'Plano não identificado';
    const p = subscription.currentPrice;
    const amount = formatMoney(p.amountCents, p.currency);
    const intervalLabel = recurringBillingLabelPt(p.recurringInterval, p.recurringIntervalCount);
    const interval = intervalLabel ? ` / ${intervalLabel}` : '';
    return `${p.productName || p.nickname || 'Plano'} (${amount}${interval})`;
  }, [subscription]);

  const openPortal = async () => {
    setOpeningPortal(true);
    setError('');
    try {
      const data = await createBillingPortalSession();
      window.location.assign(data.url);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível abrir o portal de assinatura.'));
      setOpeningPortal(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-foreground">Assinatura</h1>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-60"
        >
          <RefreshCcw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</div>}

      {isPartner ? <PartnerSubscriptionCheckout /> : null}

      <div className="space-y-4 rounded-xl bg-card p-6 shadow-card">
        <h2 className="flex items-center gap-2 font-display font-semibold text-foreground">
          <CreditCard className="h-4 w-4 text-primary" />
          Status atual
        </h2>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando assinatura…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="text-sm font-medium text-foreground">
                {subscriptionStatusLabelPt(subscription?.status)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano</p>
              <p className="text-sm font-medium text-foreground">{planDescription}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Renovação / término do ciclo</p>
              <p className="text-sm font-medium text-foreground">
                {formatDateTime(subscription?.currentPeriodEnd || null)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Fim do período de teste</p>
              <p className="text-sm font-medium text-foreground">
                {formatDateTime(subscription?.trialEndsAt || null)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cancelamento agendado</p>
              <p className="text-sm font-medium text-foreground">
                {subscription?.cancelAtPeriodEnd ? 'Sim (no fim do ciclo)' : 'Não'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Assinatura ativa</p>
              <p className="text-sm font-medium text-foreground">{subscription?.hasSubscription ? 'Sim' : 'Não'}</p>
            </div>
          </div>
        )}
      </div>

      {!isPartner ? (
        <div className="space-y-3 rounded-xl bg-card p-6 shadow-card">
          <h2 className="font-display font-semibold text-foreground">Gerenciamento da assinatura</h2>
          <p className="text-sm text-muted-foreground">
            Use o portal da sua conta para trocar de plano, cancelar assinatura e revisar método de pagamento.
          </p>
          <button
            type="button"
            onClick={() => void openPortal()}
            disabled={loading || openingPortal}
            className="inline-flex items-center gap-2 rounded-lg gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-primary hover:opacity-90 disabled:opacity-60"
          >
            <ExternalLink className="h-4 w-4" />
            {openingPortal ? 'Abrindo portal…' : 'Gerenciar assinatura'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Após contratar um plano pago, o portal da Stripe ficará disponível aqui para gerenciar cobrança e cancelamento.
        </p>
      )}
    </div>
  );
};

export default SubscriptionSettings;
