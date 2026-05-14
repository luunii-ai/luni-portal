import { appApiClient } from '@/controllers/appApiClient';

export interface CurrentSubscriptionPriceDto {
  id: string;
  nickname: string | null;
  currency: string | null;
  amountCents: number | null;
  recurringInterval: string | null;
  recurringIntervalCount: number | null;
  productId: string | null;
  productName: string | null;
}

export interface CurrentSubscriptionDto {
  hasSubscription: boolean;
  status: string;
  subscriptionId: string | null;
  customerId: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  canceledAt?: string | null;
  currentPrice: CurrentSubscriptionPriceDto | null;
}

export interface BillingPortalDto {
  url: string;
}

export interface SubscriptionPlanDto {
  id: string;
  productName: string;
  unitAmount: number | null;
  currency: string | null;
  interval: string | null;
  intervalCount: number | null;
  trialPeriodDays: number;
}

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlanDto[]> {
  const { data } = await appApiClient.get<SubscriptionPlanDto[]>('/subscriptions/plans');
  return data;
}

export interface CheckoutOfficialEmbeddedDto {
  clientSecret: string;
  sessionId: string;
}

export async function createCheckoutOfficialSession(params: {
  priceId: string;
  checkoutUi: 'embedded' | 'hosted';
  promotionCode?: string;
}): Promise<CheckoutOfficialEmbeddedDto | { url: string; sessionId: string }> {
  const { data } = await appApiClient.post<
    CheckoutOfficialEmbeddedDto | { url: string; sessionId: string }
  >('/subscriptions/checkout-official', params);
  return data;
}

export async function fetchCurrentSubscription(): Promise<CurrentSubscriptionDto> {
  const { data } = await appApiClient.get<CurrentSubscriptionDto>('/subscriptions/current');
  return data;
}

export async function createBillingPortalSession(): Promise<BillingPortalDto> {
  const { data } = await appApiClient.post<BillingPortalDto>('/subscriptions/portal');
  return data;
}
