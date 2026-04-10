import client from './client';

export async function searchPatientsForConsultation(query, limit = 10) {
  const trimmed = String(query || '').trim();

  const response = await client.get('/doctors/patients/search', {
    params: {
      q: trimmed,
      limit,
    },
  });

  return Array.isArray(response?.data?.data) ? response.data.data : [];
}

export async function getPatientSnapshotProfile(patientId) {
  const response = await client.get(`/patients/${patientId}`);
  return response.data;
}

export async function getPatientSnapshotAllergies(patientId) {
  const response = await client.get(`/doctors/patients/${patientId}/allergies`);
  return response.data;
}

export async function getPatientSnapshotConditions(patientId) {
  const response = await client.get(`/doctors/patients/${patientId}/chronic-conditions`);
  return response.data;
}

export async function getPatientSnapshotEmergency(patientId) {
  const response = await client.get(`/doctors/patients/${patientId}/emergency-info`);
  return response.data;
}

export async function startConsultation(patientId) {
  const response = await client.post('/consultations', { patient_id: patientId });
  return response.data;
}

export async function getConsultationPrescription(consultationId) {
  const response = await client.get(`/consultations/${consultationId}/prescription`);
  return response.data;
}

export async function upsertConsultationPrescription(consultationId, items, doctorNotes) {
  const response = await client.post(`/consultations/${consultationId}/prescription`, {
    items,
    doctor_notes: doctorNotes || null,
  });
  return response.data;
}

export async function updateConsultationStatus(consultationId, status) {
  const response = await client.put(`/consultations/${consultationId}/status`, { status });
  return response.data;
}

export async function finalizeConsultation(consultationId, items, doctorNotes) {
  const response = await client.post(`/consultations/${consultationId}/finalize`, {
    items,
    doctor_notes: doctorNotes || null,
  });
  return response.data;
}

// Doctor-side chronic condition CRUD
export async function createPatientCondition(consultationId, data) {
  const response = await client.post(`/consultations/${consultationId}/conditions`, data);
  return response.data;
}

export async function updatePatientCondition(consultationId, conditionId, data) {
  const response = await client.put(`/consultations/${consultationId}/conditions/${conditionId}`, data);
  return response.data;
}

export async function deletePatientCondition(consultationId, conditionId) {
  const response = await client.delete(`/consultations/${consultationId}/conditions/${conditionId}`);
  return response.data;
}
