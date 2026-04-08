import client from './client';

export async function getEmergencyPatientData(patientId, clinicId) {
  const response = await client.get(`/doctors/emergency/${patientId}/${clinicId}`);
  return response.data;
}
