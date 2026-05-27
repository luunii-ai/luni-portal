import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { billingLockState, isTrialingOfficial } from '@/lib/billingLock';
import { partnerTestLockState } from '@/lib/partnerTest';

function formatExpiry(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Barra global para contas parceiro (teste), trial ou assinatura bloqueada. */
export function PartnerTestBanner() {
  const { user } = useAuth();
  if (!user) return null;

  const billing = billingLockState(user);
  const partner = partnerTestLockState(user);
  const isPartnerTest = user.accountType === 'partner_test';

  if (billing.locked && billing.reason === 'payment_overdue') {
    return (
      <div
        className="border-b border-red-500/40 bg-red-950/90 px-4 py-2.5 text-center text-sm text-red-50"
        role="status"
      >
        <p className="font-medium">
          Pagamento pendente. Regularize sua assinatura para continuar usando a plataforma.
        </p>
        <Link
          to="/configuracoes/assinatura"
          className="mt-1 inline-block font-semibold underline underline-offset-2 hover:no-underline"
        >
          Regularizar pagamento
        </Link>
      </div>
    );
  }

  if (billing.locked && billing.reason === 'subscription_canceled') {
    return (
      <div
        className="border-b border-red-500/40 bg-red-950/90 px-4 py-2.5 text-center text-sm text-red-50"
        role="status"
      >
        <p className="font-medium">Sua assinatura encerrou. Renove o plano para voltar a usar a plataforma.</p>
        <Link
          to="/configuracoes/assinatura"
          className="mt-1 inline-block font-semibold underline underline-offset-2 hover:no-underline"
        >
          Renovar plano
        </Link>
      </div>
    );
  }

  if (isTrialingOfficial(user) && user.trialEndsAt) {
    const trialEnd = formatExpiry(user.trialEndsAt);
    return (
      <div
        className="border-b border-amber-500/40 bg-amber-950/85 px-4 py-2 text-center text-sm text-amber-50"
        role="status"
      >
        <span className="font-semibold">Período de teste</span>
        {trialEnd ? (
          <>
            <span className="mx-2 opacity-60">·</span>
            <span>Seu teste termina em {trialEnd}</span>
          </>
        ) : null}
      </div>
    );
  }

  if (!isPartnerTest) return null;

  const { locked, reason } = partner;
  const creditsLine = `${user.simulationCreditsRemaining} simulação(ões) restante(s)`;
  const dateLine = user.partnerTestExpiresAt
    ? `Prazo do teste: até ${formatExpiry(user.partnerTestExpiresAt)}`
    : null;

  if (locked) {
    const detail =
      reason === 'expired'
        ? 'O prazo do seu teste encerrou.'
        : 'Você usou todas as simulações do teste.';
    return (
      <div
        className="border-b border-red-500/40 bg-red-950/90 px-4 py-2.5 text-center text-sm text-red-50"
        role="status"
      >
        <p className="font-medium">{detail} Contrate um plano para voltar a usar a plataforma.</p>
        <Link
          to="/configuracoes/assinatura"
          className="mt-1 inline-block font-semibold underline underline-offset-2 hover:no-underline"
        >
          Escolher plano
        </Link>
      </div>
    );
  }

  return (
    <div
      className="border-b border-amber-500/40 bg-amber-950/85 px-4 py-2 text-center text-sm text-amber-50"
      role="status"
    >
      <span className="font-semibold">Conta de teste</span>
      <span className="mx-2 opacity-60">·</span>
      <span>{creditsLine}</span>
      {dateLine ? (
        <>
          <span className="mx-2 opacity-60">·</span>
          <span>{dateLine}</span>
        </>
      ) : null}
    </div>
  );
}
