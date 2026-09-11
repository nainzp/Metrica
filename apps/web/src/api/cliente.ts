import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token Bearer
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tokenAcceso');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar expiración o errores 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/ingresar')) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post('/api/auth/refrescar', {}, { withCredentials: true });
        if (data?.tokenAcceso) {
          localStorage.setItem('tokenAcceso', data.tokenAcceso);
          originalRequest.headers.Authorization = `Bearer ${data.tokenAcceso}`;
          return api(originalRequest);
        }
      } catch (err) {
        localStorage.removeItem('tokenAcceso');
        localStorage.removeItem('usuario');
        if (window.location.pathname !== '/acceso') {
          window.location.href = '/acceso';
        }
      }
    }
    return Promise.reject(error);
  },
);
