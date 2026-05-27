import type { Procedure } from '@/data/mockData';
import type { PracticeProfile } from '@/data/plasticSurgeryProcedures';
import { plasticSurgeryProcedures } from '@/data/plasticSurgeryProcedures';

/**
 * Monta `regioes` enviado ao enhance a partir dos procedimentos selecionados.
 * Ordem = ordem da seleção; deduplica textos idênticos (ignorando caixa).
 */
export function buildEnhanceRegionsText(
  selectedProcedureIds: string[],
  opts: {
    practiceProfile: PracticeProfile;
    clinicProcedures: Procedure[];
  },
): string {
  const norm = (s: string) => s.trim().toLowerCase();
  const chunks: string[] = [];
  const seen = new Set<string>();

  if (opts.practiceProfile === 'surgeon') {
    for (const id of selectedProcedureIds) {
      const def = plasticSurgeryProcedures.find((p) => p.id === id);
      const r = def?.defaultEnhanceRegions?.trim();
      if (!r) continue;
      const key = norm(r);
      if (seen.has(key)) continue;
      seen.add(key);
      chunks.push(r);
    }
  } else {
    for (const id of selectedProcedureIds) {
      const p = opts.clinicProcedures.find((c) => c.id === id);
      const r = p?.defaultEnhanceRegions?.trim();
      if (!r) continue;
      const key = norm(r);
      if (seen.has(key)) continue;
      seen.add(key);
      chunks.push(r);
    }
  }

  return chunks.join('; ');
}
