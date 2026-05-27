export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  id: 'terms' | 'privacy' | 'patient-consent';
  title: string;
  subtitle: string;
  sections: LegalSection[];
};
