export type TermsUserShape = {
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  patientDataResponsibilityAckAt?: string;
};

export function userHasAcceptedTerms(user: TermsUserShape | null | undefined): boolean {
  return Boolean(user?.termsAcceptedAt && user?.privacyAcceptedAt && user?.patientDataResponsibilityAckAt);
}

export function isTermsExemptPath(pathname: string): boolean {
  if (pathname === '/configuracoes' || pathname.startsWith('/configuracoes/')) return true;
  if (pathname.startsWith('/legal/')) return true;
  if (pathname === '/primeiro-acesso/alterar-senha') return true;
  return false;
}
