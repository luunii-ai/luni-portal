/** Perfil antes do fluxo de nova simulação. */
export type PracticeProfile = 'clinic' | 'surgeon';

export const MAMMOPLASTY_PROCEDURE_ID = 'mamoplastia-silicone';

export interface PlasticSurgeryProcedureDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Valor enviado ao agente em `tipo_procedimento` (após validação de silicone, se aplicável). */
  apiTipo: string;
  /** Exige confirmação explícita de prótese de silicone antes de gerar. */
  requiresSiliconeAck: boolean;
  /** Regiões padrão PT para campo `regioes` no enhance (alinhado ao catálogo do back-end). */
  defaultEnhanceRegions: string;
}

export const plasticSurgeryProcedures: PlasticSurgeryProcedureDef[] = [
  {
    id: 'lipo-hd',
    name: 'Lipo HD',
    description: 'Lipoaspiração de alta definição.',
    icon: '💎',
    apiTipo: 'Lipo HD',
    requiresSiliconeAck: false,
    defaultEnhanceRegions: 'abdômen, flancos e definição de contornos corporais',
  },
  {
    id: 'papada',
    name: 'Papada',
    description: 'Redução e contorno da região submentoniana.',
    icon: '✨',
    apiTipo: 'Papada',
    requiresSiliconeAck: false,
    defaultEnhanceRegions: 'região submentoniana, pescoço e transição cervical',
  },
  {
    id: 'lifting-braco',
    name: 'Lifting de braço',
    description: 'Correção de flacidez nos braços (braquioplastia).',
    icon: '💪',
    apiTipo: 'Lifting de braço',
    requiresSiliconeAck: false,
    defaultEnhanceRegions: 'braços, terços médio e proximal e axilas',
  },
  {
    id: MAMMOPLASTY_PROCEDURE_ID,
    name: 'Mamoplastia',
    description: 'Aumento ou remodelação mamária — confirme prótese de silicone para simular.',
    icon: '💗',
    apiTipo: 'Mamoplastia (prótese de silicone)',
    requiresSiliconeAck: true,
    defaultEnhanceRegions: 'mamas',
  },
  {
    id: 'rinoplastia',
    name: 'Rinoplastia',
    description: 'Cirurgia para alteração da forma do nariz.',
    icon: '👃',
    apiTipo: 'Rinoplastia',
    requiresSiliconeAck: false,
    defaultEnhanceRegions: 'nariz, ponta nasal e dorso',
  },
  {
    id: 'otoplastia',
    name: 'Otoplastia (orelha)',
    description: 'Correção estética das orelhas.',
    icon: '👂',
    apiTipo: 'Otoplastia (orelha)',
    requiresSiliconeAck: false,
    defaultEnhanceRegions: 'pavilhões auriculares e orelhas',
  },
];

/** Mapa slug → string do agente (spread em `procedureIdToApiTipo`). */
export const plasticSurgeryProcedureApiTipoMap: Record<string, string> = Object.fromEntries(
  plasticSurgeryProcedures.map((p) => [p.id, p.apiTipo]),
);

const plasticById = Object.fromEntries(plasticSurgeryProcedures.map((p) => [p.id, p])) as Record<
  string,
  PlasticSurgeryProcedureDef
>;

export function plasticProcedureDisplayName(id: string): string | undefined {
  return plasticById[id]?.name;
}
