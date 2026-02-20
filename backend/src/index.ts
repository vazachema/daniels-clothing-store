import 'dotenv/config'         // Carga las variables de .env
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'

const app = Fastify({
  logger: true    // Muestra logs en la terminal de cada petición
})

// CORS — permite que localhost:3000 (frontend) hable con localhost:4000 (backend)
app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,    // Necesario para enviar cookies
})

// Helmet — añade cabeceras de seguridad HTTP automáticamente
app.register(helmet)

// Ruta de salud — para verificar que el servidor está vivo
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Arranca el servidor
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 4000
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`\n🚀 API corriendo en http://localhost:${port}\n`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()