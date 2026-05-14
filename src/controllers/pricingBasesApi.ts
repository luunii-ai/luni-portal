import { appApiClient } from '@/controllers/appApiClient';

export interface AdditionalCostsDto {
  supplies: number;
  ppeAndHygiene: number;
  cardFee: number;
  fixedClinicShare: number;
}

export interface PricingBaseDto {
  _id?: string;
  userId?: string;
  procedureId: string;
  desiredMargin: number;
  estimatedUnits: number;
  actualUnits: number;
  costPerUnit: number;
  botoxVialPrice?: number | null;
  botoxPointsPerVial?: number | null;
  monthlyPatients: number;
  additionalCosts: AdditionalCostsDto;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchPricingBase(procedureId: string): Promise<PricingBaseDto | null> {
  const { data } = await appApiClient.get<{ pricingBase: PricingBaseDto | null }>(
    `/pricing-bases/${encodeURIComponent(procedureId)}`,
  );
  return data.pricingBase;
}

export async function savePricingBase(
  procedureId: string,
  body: Omit<PricingBaseDto, '_id' | 'userId' | 'procedureId' | 'createdAt' | 'updatedAt'>,
): Promise<PricingBaseDto> {
  const { data } = await appApiClient.put<{ pricingBase: PricingBaseDto }>(
    `/pricing-bases/${encodeURIComponent(procedureId)}`,
    body,
  );
  return data.pricingBase;
}
