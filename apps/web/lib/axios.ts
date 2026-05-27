import axios from 'axios';

// Cria uma instância do axios já configurada para o seu backend
export const api = axios.create({
  baseURL: 'http://localhost:3001',
});

// Interceptor para injetar o token automaticamente em todas as chamadas
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});