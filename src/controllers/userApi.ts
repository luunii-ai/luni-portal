import type { AppUserDto } from '@/controllers/authApi';
import { appApiClient } from '@/controllers/appApiClient';

export interface PatchMeBody {
  name?: string;
  email?: string;
  clinic?: string;
  phone?: string;
  notifEmail?: boolean;
  notifSms?: boolean;
}

export async function patchMe(body: PatchMeBody): Promise<AppUserDto> {
  const { data } = await appApiClient.patch<AppUserDto>('/me', body);
  return data;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(body: ChangePasswordBody): Promise<AppUserDto> {
  const { data } = await appApiClient.post<AppUserDto>('/me/password', body);
  return data;
}
