import type { Procedure } from '@/data/mockData';
import { appApiClient } from '@/controllers/appApiClient';

/**
 * Lista procedimentos do catálogo.
 * Com `practiceProfile`, o back-end devolve apenas itens da clínica ou do cirurgião (Nova simulação).
 * Sem argumento: lista completa (precificação, histórico, etc.).
 */
export async function fetchProcedures(
  practiceProfile?: 'clinic' | 'surgeon',
): Promise<Procedure[]> {
  const { data } = await appApiClient.get<Procedure[]>('/procedures', {
    params: practiceProfile ? { practiceProfile } : undefined,
  });
  return data;
}
