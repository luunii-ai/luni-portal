import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Save, Lock, Building2, User, CreditCard, ShieldCheck } from 'lucide-react';
import { patchMe, acceptTermsRequest } from '@/controllers/userApi';
import { fetchCurrentSubscription, type CurrentSubscriptionDto } from '@/controllers/subscriptionApi';
import { getApiErrorMessage } from '@/controllers/apiErrors';
import { formatBrazilPhoneInput, phoneDigitsOnly } from '@/lib/phoneFormat';
import { subscriptionStatusLabelPt, shouldShowCurrentPeriodEnd, shouldShowTrialEnd } from '@/lib/subscriptionDisplayPt';
import { userHasAcceptedTerms } from '@/lib/termsAcceptance';
import { LEGAL_VERSION } from '@legal/version';
import { legalDocumentLinkProps } from '@legal/linkProps';

function formatDatePt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const SettingsPage = () => {
  const { user, setUserFromDto } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [clinic, setClinic] = useState('');
  const [phone, setPhone] = useState('');
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [stripeSubscription, setStripeSubscription] = useState<CurrentSubscriptionDto | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptPatientResponsibility, setAcceptPatientResponsibility] = useState(false);
  const [termsSaving, setTermsSaving] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [termsSaved, setTermsSaved] = useState(false);
  const termsAccepted = userHasAcceptedTerms(user);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setClinic(user.clinic);
    setPhone(formatBrazilPhoneInput(user.phone || ''));
    setNotifEmail(user.notifEmail);
    setNotifSms(user.notifSms);
  }, [user]);

  useEffect(() => {
    if (!user?.email) {
      setStripeSubscription(null);
      setSubscriptionLoading(false);
      setSubscriptionError('');
      return;
    }
    let cancelled = false;
    setSubscriptionLoading(true);
    setSubscriptionError('');
    void fetchCurrentSubscription()
      .then((data) => {
        if (!cancelled) setStripeSubscription(data);
      })
      .catch((err) => {
        if (!cancelled) setSubscriptionError(getApiErrorMessage(err, 'Não foi possível carregar o status da assinatura.'));
      })
      .finally(() => {
        if (!cancelled) setSubscriptionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const handleSave = async () => {
    setError('');
    try {
      const updated = await patchMe({
        name,
        email,
        clinic,
        phone: phoneDigitsOnly(phone),
        notifEmail,
        notifSms,
      });
      setUserFromDto(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível salvar.'));
    }
  };

  const handleAcceptTerms = async () => {
    setTermsError('');
    if (!acceptTerms || !acceptPrivacy || !acceptPatientResponsibility) {
      setTermsError('Marque todas as opções para aceitar e continuar.');
      return;
    }
    setTermsSaving(true);
    try {
      const updated = await acceptTermsRequest({
        termsVersion: LEGAL_VERSION,
        acceptTerms: true,
        acceptPrivacy: true,
        acceptPatientResponsibility: true,
      });
      setUserFromDto(updated);
      setTermsSaved(true);
      setTimeout(() => setTermsSaved(false), 2500);
    } catch (err) {
      setTermsError(getApiErrorMessage(err, 'Não foi possível registrar o aceite.'));
    } finally {
      setTermsSaving(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all';

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Configurações</h1>

      {saved && (
        <div className="bg-success/10 text-success text-sm p-3 rounded-lg font-medium">
          Configurações salvas com sucesso!
        </div>
      )}
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg font-medium">{error}</div>
      )}

      {!termsAccepted && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Para usar simulações, pacientes e demais funcionalidades, aceite os termos na seção{' '}
          <strong>Privacidade e conformidade</strong> abaixo.
        </div>
      )}

      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Privacidade e conformidade
        </h2>
        <p className="text-sm text-muted-foreground">
          Documentos legais da plataforma. A clínica é controladora dos dados dos pacientes; a luni atua como operadora.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/legal/termos" {...legalDocumentLinkProps} className="text-primary hover:underline">
            Termos de Uso
          </Link>
          <Link to="/legal/privacidade" {...legalDocumentLinkProps} className="text-primary hover:underline">
            Política de Privacidade
          </Link>
          <Link to="/legal/consentimento-paciente" {...legalDocumentLinkProps} className="text-primary hover:underline">
            Modelo de consentimento do paciente
          </Link>
        </div>
        {termsAccepted ? (
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">Termos aceitos</p>
            <p className="mt-1 text-muted-foreground">
              Versão {user?.termsVersion || LEGAL_VERSION} ·{' '}
              {user?.termsAcceptedAt
                ? new Date(user.termsAcceptedAt).toLocaleString('pt-BR')
                : 'data não registrada'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <span>Li e aceito os Termos de Uso.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <span>Li e aceito a Política de Privacidade.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={acceptPatientResponsibility}
                onChange={(e) => setAcceptPatientResponsibility(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <span>
                Declaro ser responsável por obter o consentimento dos pacientes antes de enviar fotos ou dados à
                plataforma.
              </span>
            </label>
            {termsError && <p className="text-sm text-destructive">{termsError}</p>}
            {termsSaved && (
              <p className="text-sm font-medium text-emerald-600">Aceite registrado. Você já pode usar a plataforma.</p>
            )}
            <button
              type="button"
              onClick={handleAcceptTerms}
              disabled={termsSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {termsSaving ? 'Salvando…' : 'Aceitar e continuar'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          Informações Pessoais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nome</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Telefone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatBrazilPhoneInput(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          Dados da Clínica
        </h2>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Nome da clínica</label>
          <input type="text" value={clinic} onChange={(e) => setClinic(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Notificações
        </h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-foreground">Notificações por e-mail</span>
            <button
              type="button"
              onClick={() => setNotifEmail(!notifEmail)}
              className={`w-10 h-6 rounded-full transition-colors ${notifEmail ? 'bg-primary' : 'bg-secondary'}`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-card shadow-sm transition-transform mx-1 ${notifEmail ? 'translate-x-4' : ''}`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-foreground">Notificações por SMS</span>
            <button
              type="button"
              onClick={() => setNotifSms(!notifSms)}
              className={`w-10 h-6 rounded-full transition-colors ${notifSms ? 'bg-primary' : 'bg-secondary'}`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-card shadow-sm transition-transform mx-1 ${notifSms ? 'translate-x-4' : ''}`}
              />
            </button>
          </label>
        </div>
      </div> */}

      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          Alterar Senha
        </h2>
        <p className="text-sm text-muted-foreground">Em breve: alteração de senha pela API.</p>
      </div>

      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          Assinatura
        </h2>
        <p className="text-sm text-muted-foreground">
          Troque de plano, cancele assinatura e gerencie seus pagamentos no portal da sua conta. O status é
          consultado na Stripe ao abrir esta página.
        </p>
        {subscriptionLoading ? (
          <p className="text-sm text-muted-foreground">Carregando status da assinatura…</p>
        ) : subscriptionError ? (
          <p className="text-sm text-destructive">{subscriptionError}</p>
        ) : stripeSubscription || user?.subscriptionStatus ? (
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="text-sm font-medium text-foreground">
                {subscriptionStatusLabelPt(stripeSubscription?.status || user?.subscriptionStatus)}
              </p>
            </div>
            {shouldShowTrialEnd(user?.subscriptionStatus) && user?.trialEndsAt ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Seu teste termina em</p>
                <p className="text-sm font-medium text-foreground">{formatDatePt(user.trialEndsAt)}</p>
              </div>
            ) : null}
            {shouldShowCurrentPeriodEnd(user?.subscriptionStatus, user?.cancelAtPeriodEnd) &&
            user?.currentPeriodEnd ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Fim do período</p>
                <p className="text-sm font-medium text-foreground">{formatDatePt(user.currentPeriodEnd)}</p>
              </div>
            ) : null}
          </div>
        ) : null}
        <Link
          to="/configuracoes/assinatura"
          className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Abrir gerenciamento de assinatura
        </Link>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-primary hover:opacity-90 transition-all"
      >
        <Save className="w-4 h-4" />
        Salvar Configurações
      </button>
    </div>
  );
};

export default SettingsPage;
