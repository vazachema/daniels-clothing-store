import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'

const app = Fastify({ logger: true })

app.register(cors, { origin: process.env.FRONTEND_URL || 'http://localhost:3000' })
app.register(helmet)

app.get('/health', async () => ({ status: 'ok' }))

const start = async () => {
  try {
    await app.listen({ port: 4000, host: '0.0.0.0' })
    console.log('API running on http://localhost:4000')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()