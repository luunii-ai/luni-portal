import axios, { AxiosError } from 'axios';
import { getAppApiBaseUrl, getAppAuthToken } from '@/controllers/appApiClient';
import { plasticSurgeryProcedureApiTipoMap } from '@/data/plasticSurgeryProcedures';

/** Rótulos de `tipo_procedimento` esperados pelo back-end (ajuste conforme o contrato real). */
export const procedureIdToApiTipo: Record<string, string> = {
  'lip-filler': 'Preenchimento Labial',
  botox: 'Botox',
  jawline: 'Contorno de Mandíbula',
  'cheek-filler': 'Preenchimento Malar',
  nose: 'Rinomodelação',
  'bigode-chines': 'Bigode chinês (sulco nasogeniano)',
  mento: 'Preenchimento de mento (queixo)',
  olheira: 'Preenchimento de olheira',
  ...plasticSurgeryProcedureApiTipoMap,
};

export function mapProcedureIdToApiTipo(procedureId: string): string {
  return procedureIdToApiTipo[procedureId] ?? procedureId;
}

export function mapProcedureIdsToApiTipos(procedureIds: string[]): string[] {
  return procedureIds.map((id) => mapProcedureIdToApiTipo(id).trim()).filter(Boolean);
}

/** Alinha ao slider Sutil / Moderado / Dramático (0–100). */
export function intensityPercentToApiLabel(percent: number): 'sutil' | 'moderado' | 'dramatico' {
  if (percent < 33) return 'sutil';
  if (percent < 66) return 'moderado';
  return 'dramatico';
}

export type EnhancePracticeProfile = 'clinic' | 'surgeon';

export interface EnhanceImageParams {
  file: Blob;
  tipo_procedimento: string[];
  regioes: string;
  intensidade: string;
  /** 0–100 do slider do portal; enviado ao agente como `intensidade_pct` para calibragem fina (além do rótulo qualitativo). */
  intensidadePct?: number;
  /** Perfil do prompt no agente: injetáveis vs cirúrgico. Padrão: clinic. */
  practiceProfile?: EnhancePracticeProfile;
  /** Opcional; enviado ao agente como `detalhes` → `{descricao_usuario}` (clinic ou surgeon). */
  detalhes?: string;
  /** Paciente vinculado — exige consentimento registrado no backend. */
  patientId?: string;
}

function clampIntensidadePct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export interface EnhanceApiPoint {
  x: number;
  y: number;
  pixel_x?: number;
  pixel_y?: number;
}

export interface EnhanceImageResult {
  afterDataUrl: string;
  markedImageUrl: string | null;
  markedDataUrl: string | null;
  points: EnhanceApiPoint[];
  /** Par R2 (quando o back-end persistiu no bucket). */
  pairId?: string;
  r2OriginalUrl?: string;
  r2AfterUrl?: string;
}

const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/i;

const PREFERRED_BASE64_KEYS: string[] = [
  'enhanced_image_base64',
  'enhancedImageBase64',
  'image_base64',
  'imageBase64',
  'image_base64_data',
  'base64',
  'b64',
  'encoded_image',
  'content_base64',
  'png_base64',
];

/** Só se não houver campo “preferred” (ex.: `image` costuma repetir a entrada). */
const FALLBACK_BASE64_KEYS: string[] = ['image', 'data', 'content'];

const ALL_BASE64_KEYS: string[] = [...PREFERRED_BASE64_KEYS, ...FALLBACK_BASE64_KEYS];

const PRIMARY_MIME_KEYS: string[] = [
  'enhanced_mime_type',
  'enhancedMimeType',
  'mime_type',
  'mimeType',
  'content_type',
  'contentType',
  'media_type',
];

const MARKED_BASE64_KEYS: string[] = ['marked_image_base64', 'markedImageBase64'];
const MARKED_MIME_KEYS: string[] = ['marked_mime_type', 'markedMimeType', 'enhanced_mime_type', 'mime_type'];

const NEST_KEYS = ['data', 'result', 'payload', 'body', 'response', 'output'] as const;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function coerceToObject(raw: unknown): Record<string, unknown> | null {
  let v: unknown = raw;

  if (v === null || v === undefined) return null;

  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return null;
    try {
      v = JSON.parse(t) as unknown;
    } catch {
      return null;
    }
  }

  if (Array.isArray(v) && v.length > 0 && isPlainObject(v[0])) {
    return v[0] as Record<string, unknown>;
  }

  if (!isPlainObject(v)) return null;
  return v;
}

function pickStringField(d: Record<string, unknown>, keys: readonly string[]): string {
  for (const k of keys) {
    const val = d[k];
    if (typeof val === 'string' && val.trim()) return val;
  }
  return '';
}

function hasPreferredImageField(d: Record<string, unknown>): boolean {
  return Boolean(pickStringField(d, PREFERRED_BASE64_KEYS));
}

function buildDataUrl(rawB64: string, mimeFallback: string): string {
  let b64 = rawB64.replace(/\s/g, '');
  let mime = mimeFallback;

  if (b64.startsWith('data:')) {
    const m = DATA_URL_RE.exec(b64);
    if (m) {
      mime = m[1].trim();
      b64 = m[2].replace(/\s/g, '');
    }
  }

  return `data:${mime};base64,${b64}`;
}

function unwrapEnhancePayload(raw: unknown): Record<string, unknown> | null {
  const root = coerceToObject(raw);
  if (!root) return null;

  if (hasPreferredImageField(root)) return root;

  for (const k of NEST_KEYS) {
    const inner = root[k];
    if (isPlainObject(inner) && hasPreferredImageField(inner)) {
      return inner;
    }
    if (Array.isArray(inner) && inner.length > 0 && isPlainObject(inner[0])) {
      const first = inner[0] as Record<string, unknown>;
      if (hasPreferredImageField(first)) return first;
    }
  }

  if (pickStringField(root, ALL_BASE64_KEYS)) return root;

  for (const k of NEST_KEYS) {
    const inner = root[k];
    if (isPlainObject(inner) && pickStringField(inner, ALL_BASE64_KEYS)) {
      return inner;
    }
    if (Array.isArray(inner) && inner.length > 0 && isPlainObject(inner[0])) {
      const first = inner[0] as Record<string, unknown>;
      if (pickStringField(first, ALL_BASE64_KEYS)) return first;
    }
  }

  return root;
}

function parseNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeApiPoint(p: unknown): EnhanceApiPoint | null {
  if (!p || typeof p !== 'object') return null;
  const o = p as Record<string, unknown>;
  const x = parseNum(o.x);
  const y = parseNum(o.y);
  if (x === undefined || y === undefined) return null;
  const pixel_x = parseNum(o.pixel_x);
  const pixel_y = parseNum(o.pixel_y);
  return {
    x,
    y,
    ...(pixel_x !== undefined ? { pixel_x } : {}),
    ...(pixel_y !== undefined ? { pixel_y } : {}),
  };
}

function parsePointsField(d: Record<string, unknown>): EnhanceApiPoint[] {
  const raw = d.points ?? d.Points;
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeApiPoint).filter((x): x is EnhanceApiPoint => x !== null);
}

function parseMarkedImageUrl(d: Record<string, unknown>): string | null {
  const u = d.marked_image_url ?? d.markedImageUrl;
  if (typeof u === 'string' && u.trim().startsWith('http')) return u.trim();
  return null;
}

function parseEnhanceResponse(data: unknown): EnhanceImageResult {
  const d = unwrapEnhancePayload(data);
  if (!d) {
    const kind =
      data === null || data === undefined
        ? 'corpo vazio'
        : typeof data === 'string'
          ? 'texto que não é JSON válido'
          : `tipo ${typeof data}`;
    throw new Error(`Resposta inválida do servidor (${kind}). Esperado JSON com a imagem em base64.`);
  }

  const rawB64 =
    pickStringField(d, PREFERRED_BASE64_KEYS) || pickStringField(d, FALLBACK_BASE64_KEYS);
  if (!rawB64.trim()) {
    throw new Error(
      'A resposta não inclui a imagem. Procurei enhanced_image_base64 / image_base64 no JSON.',
    );
  }

  const mime = pickStringField(d, PRIMARY_MIME_KEYS) || 'image/png';
  const afterDataUrl = buildDataUrl(rawB64, mime);

  const markedB64 = pickStringField(d, MARKED_BASE64_KEYS);
  const markedMime = pickStringField(d, MARKED_MIME_KEYS) || mime;
  const markedDataUrl =
    markedB64.trim() ? buildDataUrl(markedB64, markedMime) : null;

  return {
    afterDataUrl,
    markedImageUrl: parseMarkedImageUrl(d),
    markedDataUrl,
    points: parsePointsField(d),
  };
}

function dataUrlToBase64(dataUrl: string): { base64: string; mime: string } {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (m) return { mime: m[1].trim(), base64: m[2].replace(/\s/g, '') };
  return { mime: 'image/png', base64: dataUrl.replace(/\s/g, '') };
}

function mimeFromDataUrl(dataUrl: string): string {
  return dataUrlToBase64(dataUrl).mime;
}

export interface FinalizePreviewResult {
  pairId?: string;
  r2OriginalUrl?: string;
  r2AfterUrl?: string;
}

function appendPatientConsentFields(formData: FormData, patientId?: string) {
  const id = patientId?.trim();
  if (!id) return;
  formData.append('patient_id', id);
  formData.append('patient_consent_ack', '1');
}

export async function enhancePreview(params: EnhanceImageParams): Promise<EnhanceImageResult> {
  const { file, tipo_procedimento, regioes, intensidade, intensidadePct, practiceProfile, detalhes, patientId } =
    params;
  const formData = new FormData();
  formData.append('image', file, file instanceof File ? file.name : 'upload.jpg');
  for (const tipo of tipo_procedimento) {
    const t = tipo.trim();
    if (t) formData.append('tipo_procedimento', t);
  }
  formData.append('regioes', regioes);
  formData.append('intensidade', intensidade);
  if (intensidadePct != null && Number.isFinite(intensidadePct)) {
    formData.append('intensidade_pct', String(clampIntensidadePct(intensidadePct)));
  }
  if (practiceProfile) {
    formData.append('practice_profile', practiceProfile);
  }
  const d = detalhes?.trim();
  if (d) formData.append('detalhes', d);
  appendPatientConsentFields(formData, patientId);

  const url = `${getAppApiBaseUrl()}/v1/enhance?preview=1&format=json`;
  const token = getAppAuthToken();

  const { data } = await axios.post<Record<string, unknown>>(url, formData, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const parsed = parseEnhanceResponse(data);
  return parsed;
}

export async function finalizePreview(params: {
  originalDataUrl: string;
  originalMime: string;
  afterDataUrl: string;
  afterMime?: string;
}): Promise<FinalizePreviewResult> {
  const { originalDataUrl, originalMime, afterDataUrl } = params;
  const afterMime = params.afterMime ?? mimeFromDataUrl(afterDataUrl);

  const { base64: originalBase64 } = dataUrlToBase64(originalDataUrl);
  const { base64: afterBase64 } = dataUrlToBase64(afterDataUrl);

  const url = `${getAppApiBaseUrl()}/v1/enhance/finalize`;
  const token = getAppAuthToken();

  const { data } = await axios.post<{
    pairId?: string | null;
    r2_original_url?: string;
    r2_after_url?: string;
  }>(
    url,
    { originalBase64, originalMime, afterBase64, afterMime },
    { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
  );

  return {
    pairId: data?.pairId ?? undefined,
    r2OriginalUrl:
      typeof data?.r2_original_url === 'string' && data.r2_original_url.trim()
        ? data.r2_original_url.trim()
        : undefined,
    r2AfterUrl:
      typeof data?.r2_after_url === 'string' && data.r2_after_url.trim()
        ? data.r2_after_url.trim()
        : undefined,
  };
}

export async function enhanceImage(params: EnhanceImageParams): Promise<EnhanceImageResult> {
  const { file, tipo_procedimento, regioes, intensidade, intensidadePct, practiceProfile, detalhes, patientId } =
    params;
  const formData = new FormData();
  formData.append('image', file, file instanceof File ? file.name : 'upload.jpg');
  for (const tipo of tipo_procedimento) {
    const t = tipo.trim();
    if (t) formData.append('tipo_procedimento', t);
  }
  formData.append('regioes', regioes);
  formData.append('intensidade', intensidade);
  if (intensidadePct != null && Number.isFinite(intensidadePct)) {
    formData.append('intensidade_pct', String(clampIntensidadePct(intensidadePct)));
  }
  if (practiceProfile) {
    formData.append('practice_profile', practiceProfile);
  }
  const d = detalhes?.trim();
  if (d) formData.append('detalhes', d);
  appendPatientConsentFields(formData, patientId);

  const url = `${getAppApiBaseUrl()}/v1/enhance?format=json`;
  const token = getAppAuthToken();

  const { data } = await axios.post<Record<string, unknown> & { pairId?: string }>(url, formData, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const pairId = typeof data?.pairId === 'string' && data.pairId.trim() ? data.pairId.trim() : undefined;
  const r2OriginalUrl =
    typeof data?.r2_original_url === 'string' && data.r2_original_url.trim()
      ? data.r2_original_url.trim()
      : undefined;
  const r2AfterUrl =
    typeof data?.r2_after_url === 'string' && data.r2_after_url.trim() ? data.r2_after_url.trim() : undefined;

  const parsed = parseEnhanceResponse(data);
  return {
    ...parsed,
    ...(pairId ? { pairId } : {}),
    ...(r2OriginalUrl ? { r2OriginalUrl } : {}),
    ...(r2AfterUrl ? { r2AfterUrl } : {}),
  };
}

export function enhanceErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ detail?: string; message?: string }>;
    const detail = ax.response?.data?.detail ?? ax.response?.data?.message;
    if (typeof detail === 'string') return detail;
    if (ax.response?.status) return `Erro ${ax.response.status} ao gerar a simulação.`;
    if (ax.message) return ax.message;
  }
  if (err instanceof Error) return err.message;
  return 'Não foi possível gerar a simulação.';
}

/** Converte x ou y da API para % CSS (0–100). Valores em [0,1] tratados como normalizados. */
export function apiCoordToPercent(value: number): number {
  if (value >= 0 && value <= 1) return value * 100;
  if (value > 1 && value <= 100) return value;
  return Math.min(100, Math.max(0, value));
}
