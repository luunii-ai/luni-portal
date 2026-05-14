export type AccountType = 'official' | 'partner_test';

/** Shape aligned with GET /me after login. */
export type PartnerTestUserShape = {
  accountType?: AccountType;
  simulationCreditsRemaining: number;
  partnerTestExpiresAt?: string | null;
};

export type PartnerTestLockReason = 'credits' | 'expired';

export function partnerTestLockState(user: PartnerTestUserShape | null): {
  locked: boolean;
  reason: PartnerTestLockReason | null;
} {
  if (!user || user.accountType !== 'partner_test') return { locked: false, reason: null };
  const credits = user.simulationCreditsRemaining ?? 0;
  if (credits <= 0) return { locked: true, reason: 'credits' };
  const exp = user.partnerTestExpiresAt;
  if (exp) {
    const t = new Date(exp).getTime();
    if (!Number.isNaN(t) && Date.now() >= t) return { locked: true, reason: 'expired' };
  }
  return { locked: false, reason: null };
}
