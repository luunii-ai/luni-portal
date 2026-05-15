/** Tipos e pontos anatômicos estáticos (catálogo de procedimentos vem da API). */

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastVisit: string;
  proceduresSimulated: number;
  notes: string;
  avatarUrl?: string;
}

export interface Simulation {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  procedure: string;
  procedureId?: string;
  date: string;
  intensity: number;
  points?: number;
  costPerPoint?: number;
  image?: string;
  enhancePairId?: string;
  activePointIds?: number[];
  saleCompleted?: boolean;
}

export interface Procedure {
  id: string;
  name: string;
  description: string;
  icon: string;
  hasPoints: boolean;
  defaultPoints: number;
  costPerPoint: number;
  pricePerPoint: number;
  /** Escopo no catálogo do back-end (clínica vs cirurgião); ausente em respostas antigas. */
  practiceProfileScope?: 'clinic' | 'surgeon';
}

export const botoxFacialPoints = [
  { id: 1, name: 'Frontal (testa)', x: 50, y: 15, region: 'Terço Superior' },
  { id: 2, name: 'Frontal lateral D', x: 35, y: 17, region: 'Terço Superior' },
  { id: 3, name: 'Frontal lateral E', x: 65, y: 17, region: 'Terço Superior' },
  { id: 4, name: 'Glabela central', x: 50, y: 25, region: 'Terço Superior' },
  { id: 5, name: 'Corrugador D', x: 42, y: 26, region: 'Terço Superior' },
  { id: 6, name: 'Corrugador E', x: 58, y: 26, region: 'Terço Superior' },
  { id: 7, name: 'Prócerus', x: 50, y: 30, region: 'Terço Superior' },
  { id: 8, name: 'Orbicular olho D (pé de galinha)', x: 28, y: 35, region: 'Terço Médio' },
  { id: 9, name: 'Orbicular olho E (pé de galinha)', x: 72, y: 35, region: 'Terço Médio' },
  { id: 10, name: 'Orbicular olho D inferior', x: 32, y: 40, region: 'Terço Médio' },
  { id: 11, name: 'Orbicular olho E inferior', x: 68, y: 40, region: 'Terço Médio' },
  { id: 12, name: 'Bunny lines D', x: 43, y: 42, region: 'Terço Médio' },
  { id: 13, name: 'Bunny lines E', x: 57, y: 42, region: 'Terço Médio' },
  { id: 14, name: 'Elevador do lábio D', x: 40, y: 55, region: 'Terço Inferior' },
  { id: 15, name: 'Elevador do lábio E', x: 60, y: 55, region: 'Terço Inferior' },
  { id: 16, name: 'Orbicular da boca (lábio superior)', x: 50, y: 62, region: 'Terço Inferior' },
  { id: 17, name: 'DAO D (comissura)', x: 38, y: 68, region: 'Terço Inferior' },
  { id: 18, name: 'DAO E (comissura)', x: 62, y: 68, region: 'Terço Inferior' },
  { id: 19, name: 'Mentual (queixo)', x: 50, y: 78, region: 'Terço Inferior' },
  { id: 20, name: 'Masseter D', x: 22, y: 60, region: 'Terço Inferior' },
  { id: 21, name: 'Masseter E', x: 78, y: 60, region: 'Terço Inferior' },
];
