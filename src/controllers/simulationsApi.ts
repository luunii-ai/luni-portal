import type { Simulation } from '@/data/mockData';
import { appApiClient } from '@/controllers/appApiClient';

export interface ListSimulationsParams {
  patientId?: string;
  procedure?: string;
  from?: string;
  to?: string;
}

export async function fetchSimulations(params?: ListSimulationsParams): Promise<Simulation[]> {
  const { data } = await appApiClient.get<Simulation[]>('/simulations', { params });
  return data;
}

export interface CreateSimulationBody {
  patientId?: string;
  patient?: { name: string; email: string; phone: string };
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  procedure: string;
  procedureId?: string;
  date?: string;
  intensity: number;
  points?: number;
  costPerPoint?: number;
  image?: string;
  enhancePairId?: string;
  activePointIds?: number[];
}

export async function createSimulation(body: CreateSimulationBody): Promise<Simulation> {
  const { data } = await appApiClient.post<Simulation>('/simulations', body);
  return data;
}

export async function deleteSimulation(id: string): Promise<void> {
  await appApiClient.delete(`/simulations/${id}`);
}

export async function patchSimulationSale(id: string, saleCompleted: boolean): Promise<Simulation> {
  const { data } = await appApiClient.patch<Simulation>(`/simulations/${id}`, { saleCompleted });
  return data;
}
