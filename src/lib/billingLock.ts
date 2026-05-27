import { partnerTestLockState, type PartnerTestUserShape } from '@/lib/partnerTest';

const PAYMENT_OVERDUE_STATUSES = new Set(['past_due', 'unpaid']);
const CANCELED_SUBSCRIPTION_STATUSES = new Set(['canceled', 'cancelled', 'incomplete_expired']);

export type BillingLockReason =
  | 'partner_credits'
  | 'partner_expired'
  | 'payment_overdue'
  | 'subscription_canceled';

export type BillingLockUserShape = PartnerTestUserShape & {
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};

function toTimestamp(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

export function subscriptionLockState(user: BillingLockUserShape | null): {
  locked: boolean;
  reason?: 'payment_overdue' | 'subscription_canceled';
} {
  if (!user || user.accountType === 'partner_test') return { locked: false };

  const status = String(user.subscriptionStatus || '').toLowerCase();

  if (PAYMENT_OVERDUE_STATUSES.has(status)) {
    return { locked: true, reason: 'payment_overdue' };
  }

  if (CANCELED_SUBSCRIPTION_STATUSES.has(status)) {
    const periodEnd = toTimestamp(user.currentPeriodEnd);
    if (periodEnd && Date.now() < periodEnd) {
      return { locked: false };
    }
    return { locked: true, reason: 'subscription_canceled' };
  }

  return { locked: false };
}

export function isTrialingOfficial(user: BillingLockUserShape | null): boolean {
  if (!user || user.accountType === 'partner_test') return false;
  return String(user.subscriptionStatus || '').toLowerCase() === 'trialing';
}

export function billingLockState(user: BillingLockUserShape | null): {
  locked: boolean;
  reason: BillingLockReason | null;
} {
  const partner = partnerTestLockState(user);
  if (partner.locked) {
    return {
      locked: true,
      reason: partner.reason === 'expired' ? 'partner_expired' : 'partner_credits',
    };
  }

  const sub = subscriptionLockState(user);
  if (sub.locked && sub.reason) {
    return { locked: true, reason: sub.reason };
  }

  return { locked: false, reason: null };
}
