import type { Procedure } from '@/data/mockData';
import { appApiClient } from '@/controllers/appApiClient';

export async function fetchProcedures(): Promise<Procedure[]> {
  const { data } = await appApiClient.get<Procedure[]>('/procedures');
  return data;
}
