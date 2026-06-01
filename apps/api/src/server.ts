import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import path from 'path' 
import dotenv from 'dotenv'
import { authRoutes } from './routes/auth'
import { pratosRoutes } from './routes/pratos'
import { pedidosRoutes } from './routes/pedidos'
import { contatosRoutes } from './routes/contatos'
import { adicionaisRoutes } from './routes/adicionais'

const app = Fastify({ logger: true })

dotenv.config({ path: path.resolve(__dirname, '../.env') })

app.register(cors, { 
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
})
app.register(jwt, { secret: process.env.JWT_SECRET! })

app.get('/health', async () => {
  return { status: 'ok' }
})

app.register(authRoutes, { prefix: '/auth' }) 
app.register(pratosRoutes, { prefix: '/pratos' })
app.register(pedidosRoutes, { prefix: '/pedidos' })
app.register(contatosRoutes, { prefix: '/contatos' })
app.register(adicionaisRoutes, { prefix: '/adicionais' })

const start = async () => {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' })
    console.log('API rodando em http://localhost:3001')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()