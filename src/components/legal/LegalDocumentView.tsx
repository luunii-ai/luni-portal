import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import type { LegalDocument } from '@legal/types';
import { LEGAL_LAST_UPDATED, LEGAL_VERSION } from '@legal/version';
import { downloadLegalPdf } from '@/lib/downloadLegalPdf';

type Props = {
  document: LegalDocument;
  backHref?: string;
  backLabel?: string;
};

export function LegalDocumentView({ document, backHref = '/configuracoes', backLabel = 'Voltar às configurações' }: Props) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Versão {LEGAL_VERSION} · Atualizado em {LEGAL_LAST_UPDATED}
        </p>
        <button
          type="button"
          onClick={() => downloadLegalPdf(document)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <Download className="h-4 w-4" />
          Baixar PDF
        </button>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">{document.title}</h1>
      <p className="mt-4 text-muted-foreground">{document.subtitle}</p>
      <div className="mt-10 space-y-8">
        {document.sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-lg font-semibold text-foreground">{section.title}</h2>
            <div className="mt-3 space-y-3">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="text-sm leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-12 text-sm text-muted-foreground">
        <Link to={backHref} className="font-medium text-primary hover:underline">
          ← {backLabel}
        </Link>
      </p>
    </article>
  );
}
