import type { Patient } from '@/data/mockData';
import { appApiClient } from '@/controllers/appApiClient';

export async function fetchPatients(q?: string): Promise<Patient[]> {
  const { data } = await appApiClient.get<Patient[]>('/patients', {
    params: q?.trim() ? { q: q.trim() } : undefined,
  });
  return data;
}

export async function fetchPatient(id: string): Promise<Patient> {
  const { data } = await appApiClient.get<Patient>(`/patients/${id}`);
  return data;
}

export type PatientPhoneLookup = {
  exists: boolean;
  patient?: Patient;
};

export async function checkPatientPhone(phone: string): Promise<PatientPhoneLookup> {
  const { data } = await appApiClient.get<PatientPhoneLookup>('/patients/phone-lookup', {
    params: { phone },
  });
  return data;
}

export async function ensurePatient(body: {
  name: string;
  email: string;
  phone: string;
  recordPhotoConsent?: boolean;
}): Promise<Patient> {
  const { data } = await appApiClient.post<Patient>('/patients/ensure', body);
  return data;
}

export async function recordPatientPhotoConsent(id: string, consentVersion?: string): Promise<Patient> {
  const { data } = await appApiClient.post<Patient>(`/patients/${id}/photo-consent`, {
    consentVersion,
  });
  return data;
}

export async function patchPatient(
  id: string,
  body: Partial<Pick<Patient, 'name' | 'email' | 'phone' | 'notes'>>,
): Promise<Patient> {
  const { data } = await appApiClient.patch<Patient>(`/patients/${id}`, body);
  return data;
}

export async function deletePatient(id: string): Promise<void> {
  await appApiClient.delete(`/patients/${id}`);
}
