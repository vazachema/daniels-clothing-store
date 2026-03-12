import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../lib/jwt'

// Extiende el tipo de Request de Fastify para añadir el campo "user"
// Así TypeScript sabe que request.user existe en rutas protegidas
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string
      role: string
    }
  }
}

// Middleware de autenticación — verifica que el Access Token es válido
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    // El token llega en el header: Authorization: Bearer eyJ...
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'No autenticado' })
    }

    // Extrae el token quitando el "Bearer " del principio
    const token = authHeader.substring(7)

    // Verifica el token — si es inválido o expirado, lanza un error
    const payload = verifyAccessToken(token)

    // Añade los datos del usuario al request para que la ruta los use
    request.user = payload

  } catch {
    return reply.status(401).send({ error: 'Token inválido o expirado' })
  }
}

// Middleware de admin — verifica que el usuario tiene rol ADMIN
// Siempre se usa DESPUÉS de requireAuth
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (request.user?.role !== 'ADMIN') {
    return reply.status(403).send({ error: 'No tienes permisos para esta acción' })
  }
}

// Añade esta función al archivo existente
// Diferencia con requireAuth:
// requireAuth → si no hay token, rechaza con 401
// optionalAuth → si no hay token, continúa sin user
export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) return
    // Si no hay token simplemente no hace nada — no rechaza

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    request.user = payload
  } catch {
    // Token inválido — lo ignoramos y continuamos como anónimo
  }
}