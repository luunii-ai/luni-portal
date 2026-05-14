import { appApiClient } from '@/controllers/appApiClient';

export interface EnhancePairImages {
  originalUrl: string;
  afterUrl: string;
}

export async function fetchEnhancePairImages(pairId: string): Promise<EnhancePairImages> {
  const { data } = await appApiClient.get<EnhancePairImages>(`/enhance-pairs/${encodeURIComponent(pairId)}`);
  return data;
}

/** Lê a imagem “depois” pela API (mesma origem, sem CORS do R2). */
export async function downloadEnhanceAfterAsBlob(pairId: string): Promise<Blob> {
  const { data } = await appApiClient.get<Blob>(
    `/enhance-pairs/${encodeURIComponent(pairId)}/after`,
    { responseType: 'blob' },
  );
  return data;
}
