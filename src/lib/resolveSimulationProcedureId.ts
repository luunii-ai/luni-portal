import type { Procedure } from '@/data/mockData';
import { plasticSurgeryProcedures } from '@/data/plasticSurgeryProcedures';

/** Labels like "Rinoplastia · Botox" → try each segment, then full string. */
function procedureNameCandidates(procedureName: string): string[] {
  const trimmed = procedureName.trim();
  if (!trimmed) return [];
  const segments = trimmed
    .split(' · ')
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of segments.length ? segments : [trimmed]) {
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  if (!seen.has(trimmed)) out.push(trimmed);
  return out;
}

/**
 * Resolves slug for navigation / persisted simulation when API catalog lacks surgery rows
 * or legacy rows stored procedureId "botox" with a human procedure name.
 */
export function resolveSimulationProcedureId(
  procedureName: string,
  procedures: Procedure[],
  savedProcedureId?: string,
): string {
  const names = procedureNameCandidates(procedureName);
  for (const name of names) {
    const fromApi = procedures.find((p) => p.name === name)?.id;
    if (fromApi) return fromApi;
  }
  for (const name of names) {
    const fromPlastic = plasticSurgeryProcedures.find((p) => p.name === name)?.id;
    if (fromPlastic) return fromPlastic;
  }
  if (savedProcedureId) return savedProcedureId;
  return 'botox';
}
