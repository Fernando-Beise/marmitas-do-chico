import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:3001' // URL do nosso backend Fastify
})

// Função utilitária para fixar o Token JWT após o login do Francisco
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}