import apiClient from './client';

export async function getOwnPatientProfile() {
  const response = await apiClient.get('/patients', {
    params: { _ts: Date.now() },
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
  return response.data;
}

export async function updateOwnPatientProfile(payload) {
  const response = await apiClient.put('/patients', payload);
  return response.data;
}

export async function createPatientProfile(payload) {
  const response = await apiClient.post('/patients', payload);
  return response.data;
}

export async function getPatientConsultations() {
  const response = await apiClient.get('/patients/consultations');
  return response.data;
}

export async function getPatientAccessList() {
  const response = await apiClient.get('/patients/access-list');
  return response.data;
}

export async function grantDoctorAccess(payload) {
  const response = await apiClient.post('/patients/grant-access', payload);
  return response.data;
}

export async function revokeDoctorAccess(doctorId) {
  const response = await apiClient.delete(`/patients/revoke-access/${doctorId}`);
  return response.data;
}

export async function getAllergies() {
  const response = await apiClient.get('/patients/allergies');
  return response.data;
}

export async function createAllergy(payload) {
  const response = await apiClient.post('/patients/allergies', payload);
  return response.data;
}

export async function updateAllergy(id, payload) {
  const response = await apiClient.put(`/patients/allergies/${id}`, payload);
  return response.data;
}

export async function deleteAllergy(id) {
  const response = await apiClient.delete(`/patients/allergies/${id}`);
  return response.data;
}

export async function getChronicConditions() {
  const response = await apiClient.get('/patients/chronic-conditions');
  return response.data;
}

export async function createChronicCondition(payload) {
  const response = await apiClient.post('/patients/chronic-conditions', payload);
  return response.data;
}

export async function updateChronicCondition(id, payload) {
  const response = await apiClient.put(`/patients/chronic-conditions/${id}`, payload);
  return response.data;
}

export async function deleteChronicCondition(id) {
  const response = await apiClient.delete(`/patients/chronic-conditions/${id}`);
  return response.data;
}

export async function getEmergencyInfo() {
  const response = await apiClient.get('/patients/emergency-info');
  return response.data;
}

export async function createEmergencyInfo(payload) {
  const response = await apiClient.post('/patients/emergency-info', payload);
  return response.data;
}

export async function updateEmergencyInfo(id, payload) {
  const response = await apiClient.put(`/patients/emergency-info/${id}`, payload);
  return response.data;
}

export async function deleteEmergencyInfo(id) {
  const response = await apiClient.delete(`/patients/emergency-info/${id}`);
  return response.data;
}
