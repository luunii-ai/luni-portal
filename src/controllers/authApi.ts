import { appApiClient, setAppAuthToken } from '@/controllers/appApiClient';

export type AppAccountType = 'official' | 'partner_test';

export interface AppUserDto {
  name: string;
  email: string;
  clinic: string;
  phone?: string;
  notifEmail?: boolean;
  notifSms?: boolean;
  firstAccess?: boolean;
  subscriptionStatus?: string;
  trialEndsAt?: string;
  simulationCreditsRemaining?: number;
  simulationMonthlyQuota?: number;
  previewCreditsRemaining?: number;
  previewMonthlyQuota?: number;
  accountType?: AppAccountType;
  partnerTestExpiresAt?: string | null;
}

export async function loginRequest(email: string, password: string): Promise<AppUserDto> {
  const { data } = await appApiClient.post<{ token: string; user: AppUserDto }>('/auth/login', {
    email,
    password,
  });
  setAppAuthToken(data.token);
  return data.user;
}

export async function signupRequest(
  name: string,
  clinic: string,
  email: string,
  password: string,
): Promise<AppUserDto> {
  const { data } = await appApiClient.post<{ token: string; user: AppUserDto }>('/auth/signup', {
    name,
    clinic,
    email,
    password,
  });
  setAppAuthToken(data.token);
  return data.user;
}

export async function fetchMe(): Promise<AppUserDto> {
  const { data } = await appApiClient.get<AppUserDto>('/me');
  return data;
}

export async function forgotPasswordRequest(email: string): Promise<void> {
  await appApiClient.post('/auth/forgot-password', { email });
}

export async function resetPasswordRequest(token: string, newPassword: string): Promise<void> {
  await appApiClient.post('/auth/reset-password', { token, newPassword });
}
