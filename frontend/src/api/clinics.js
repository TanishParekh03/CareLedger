import client from './client';

export async function getDoctorClinics() {
  const response = await client.get('/clinics');
  return response.data;
}

export async function createClinic(payload) {
  const response = await client.post('/clinics', payload);
  return response.data;
}

export async function updateClinic(id, payload) {
  const response = await client.put(`/clinics/${id}`, payload);
  return response.data;
}

export async function deleteClinic(id) {
  const response = await client.delete(`/clinics/${id}`);
  return response.data;
}
