import apiClient from './client';

export async function getPrescriptionByConsultationId(consultationId) {
  const response = await apiClient.get(`/consultations/${consultationId}/prescription`);
  return response.data;
}
