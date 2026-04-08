import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const apiCode = error?.response?.data?.error?.code;
    const apiMessage = error?.response?.data?.error?.message || '';

    if (
      apiCode === 'VALIDATION_ERROR' &&
      typeof apiMessage === 'string' &&
      /valid\s+uuid/i.test(apiMessage)
    ) {
      const friendly = 'No records available yet.';
      error.userMessage = friendly;
      error.isRecoverable = true;

      if (error?.response?.data?.error) {
        error.response.data.error.message = friendly;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
