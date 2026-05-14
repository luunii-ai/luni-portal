/**
 * Dados leves do fluxo nova simulação → resultado (cliente, intensidade, pairId).
 * history.state pode ser truncado se misturado com base64 grande; este backup evita perda.
 */
const KEY = 'beleza_estrategica_simulation_flow';

export interface SimulationFlowSnapshot {
  pairId?: string;
  patientDraft: { name: string; email: string; phone: string };
  patientMode: 'new' | 'existing';
  selectedPatientId?: string;
  patientId?: string;
  intensity: number;
  procedures: string[];
  procedure?: string;
  patient?: { name: string; email: string; phone: string };
  enhanceAfterFromSession?: boolean;
  enhanceMetaFromSession?: boolean;
  r2OriginalUrl?: string;
  r2AfterUrl?: string;
  afterImage?: string;
  image?: string;
  activePointIds?: number[];
  /** Perfil escolhido no início do fluxo (clínica estética vs cirurgião plástico). */
  practiceProfile?: 'clinic' | 'surgeon';
  /** Descrição do resultado desejado (perfil cirurgião); obrigatório na geração. */
  detalhes?: string;
}

export function persistSimulationFlow(snapshot: SimulationFlowSnapshot): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Só reutiliza o backup se o pairId bater com URL ou state (evita misturar sessões).
 */
export function readSimulationFlow(
  pairIdFromUrl?: string | null,
  pairIdFromState?: string | null,
): Partial<SimulationFlowSnapshot> | null {
  const expected = (pairIdFromUrl || pairIdFromState || '').trim() || undefined;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SimulationFlowSnapshot;
    if (!parsed || typeof parsed !== 'object' || !parsed.patientDraft) return null;
    const storedPair = (parsed.pairId || '').trim() || undefined;
    if (expected) {
      if (storedPair !== expected) return null;
    } else if (storedPair) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSimulationFlow(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
