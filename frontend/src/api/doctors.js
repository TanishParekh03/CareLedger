import client from './client';

export async function getDoctorProfile() {
  const response = await client.get('/doctors', {
    params: { _ts: Date.now() },
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });

  return response.data;
}

export async function createDoctorProfile(payload) {
  const response = await client.post('/doctors', payload);
  return response.data;
}

export async function updateDoctorProfile(payload) {
  const response = await client.put('/doctors', payload);
  return response.data;
}

export async function getDoctorConsultations() {
  const response = await client.get('/doctors/consultations');
  return response.data;
}

export async function searchDoctorDirectory(query, limit = 8) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const { data } = await client.get('/doctors/directory', {
    params: {
      q: trimmed,
      limit,
    },
  });

  return Array.isArray(data?.data) ? data.data : [];
}
