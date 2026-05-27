import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { termsOfUsePt } from '@legal/terms-of-use.pt';

const LegalTermsPage = () => (
  <LegalDocumentView document={termsOfUsePt} backHref="/configuracoes" backLabel="Voltar às configurações" />
);

export default LegalTermsPage;
