import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { patientConsentPt } from '@legal/patient-consent.pt';

const LegalPatientConsentPage = () => (
  <LegalDocumentView document={patientConsentPt} backHref="/configuracoes" backLabel="Voltar às configurações" />
);

export default LegalPatientConsentPage;
