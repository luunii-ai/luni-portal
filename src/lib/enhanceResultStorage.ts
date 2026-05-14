import type { EnhanceApiPoint } from '@/controllers/enhanceApi';

/** Evita colocar base64 enorme em `history.state` (limite do browser / perda silenciosa). */
export const ENHANCE_AFTER_IMAGE_KEY = 'beleza_estrategica_enhance_after_image';

export const ENHANCE_META_KEY = 'beleza_estrategica_enhance_meta';

export interface StoredEnhanceMeta {
  points: EnhanceApiPoint[];
  markedImageUrl: string | null;
}

/** @returns se gravou com sucesso (se false, use `afterImage` no state da rota como fallback). */
export function storeEnhanceAfterImage(dataUrl: string): boolean {
  try {
    sessionStorage.setItem(ENHANCE_AFTER_IMAGE_KEY, dataUrl);
    return true;
  } catch {
    return false;
  }
}

export function storeEnhanceMeta(meta: StoredEnhanceMeta): boolean {
  try {
    sessionStorage.setItem(ENHANCE_META_KEY, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}

export function getStoredEnhanceMeta(): StoredEnhanceMeta | null {
  try {
    const raw = sessionStorage.getItem(ENHANCE_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEnhanceMeta;
    if (!parsed || !Array.isArray(parsed.points)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getStoredEnhanceAfterImage(): string | null {
  try {
    return sessionStorage.getItem(ENHANCE_AFTER_IMAGE_KEY);
  } catch {
    return null;
  }
}
