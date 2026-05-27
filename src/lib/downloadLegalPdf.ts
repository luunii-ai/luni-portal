import { jsPDF } from 'jspdf';
import type { LegalDocument } from '@legal/types';
import { LEGAL_LAST_UPDATED, LEGAL_VERSION } from '@legal/version';

const FILENAME_BY_ID: Record<LegalDocument['id'], string> = {
  terms: 'luni-termos-de-uso',
  privacy: 'luni-politica-de-privacidade',
  'patient-consent': 'luni-consentimento-paciente',
};

export function downloadLegalPdf(document: LegalDocument): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const marginX = 20;
  const marginTop = 20;
  const marginBottom = 25;
  const lineHeight = 5;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - marginX * 2;
  let y = marginTop;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - marginBottom) {
      pdf.addPage();
      y = marginTop;
    }
  };

  const writeBlock = (
    text: string,
    options: { fontSize?: number; fontStyle?: 'normal' | 'bold'; spacingAfter?: number } = {},
  ) => {
    const fontSize = options.fontSize ?? 10;
    const fontStyle = options.fontStyle ?? 'normal';
    const spacingAfter = options.spacingAfter ?? 3;
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    const lines = pdf.splitTextToSize(text, contentWidth) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight);
      pdf.text(line, marginX, y);
      y += lineHeight;
    }
    y += spacingAfter;
  };

  writeBlock(`Versão ${LEGAL_VERSION} · Atualizado em ${LEGAL_LAST_UPDATED}`, {
    fontSize: 9,
    spacingAfter: 6,
  });
  writeBlock(document.title, { fontSize: 16, fontStyle: 'bold', spacingAfter: 4 });
  writeBlock(document.subtitle, { fontSize: 11, spacingAfter: 8 });

  for (const section of document.sections) {
    writeBlock(section.title, { fontSize: 12, fontStyle: 'bold', spacingAfter: 3 });
    for (const paragraph of section.paragraphs) {
      writeBlock(paragraph, { fontSize: 10, spacingAfter: 4 });
    }
    y += 2;
  }

  pdf.save(`${FILENAME_BY_ID[document.id]}-${LEGAL_VERSION}.pdf`);
}
