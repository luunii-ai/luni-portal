import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { privacyPolicyPt } from '@legal/privacy-policy.pt';

const LegalPrivacyPage = () => (
  <LegalDocumentView document={privacyPolicyPt} backHref="/configuracoes" backLabel="Voltar às configurações" />
);

export default LegalPrivacyPage;
