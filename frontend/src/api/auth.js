import apiClient from './client';

export async function loginUser(payload) {
  const response = await apiClient.post('/users/login', payload);
  return response.data;
}

export async function signupUser(payload) {
  const response = await apiClient.post('/users/signup', payload);
  return response.data;
}
