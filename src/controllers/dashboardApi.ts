import { appApiClient } from '@/controllers/appApiClient';

export interface DashboardSummary {
  totalSimulations: number;
  totalPatients: number;
  proceduresThisMonth: number;
  totalSales: number;
  totalNoSales: number;
  conversionRate: number;
  recentSimulations: Array<{
    id: string;
    patientName: string;
    procedure: string;
    date: string;
    points?: number;
    saleCompleted?: boolean;
  }>;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await appApiClient.get<DashboardSummary>('/dashboard/summary');
  return data;
}
