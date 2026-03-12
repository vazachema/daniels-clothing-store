import { FastifyInstance } from 'fastify'
import { cartService } from '../services/cart.service'
import { addItemSchema, updateItemSchema } from '../schemas/cart.schema'
import { optionalAuth, requireAuth } from '../middleware/auth.middleware'
import crypto from 'crypto'

// Configuración de la cookie del sessionId para carritos anónimos
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60,   // 7 días en segundos
  path: '/',
}

// Helper — obtiene o genera el sessionId del usuario anónimo
// Si no tiene cookie de sesión, le creamos una
function getOrCreateSessionId(request: any, reply: any): string {
  const existingSession = request.cookies?.sessionId
  if (existingSession) return existingSession

  const newSessionId = crypto.randomBytes(32).toString('hex')
  reply.setCookie('sessionId', newSessionId, SESSION_COOKIE_OPTIONS)
  return newSessionId
}

export async function cartRoute(app: FastifyInstance) {

  // GET /cart — ver el carrito
  // Funciona tanto para usuarios logueados como anónimos
  app.get('/', { preHandler: [optionalAuth] }, async (request, reply) => {
    try {
      const userId = (request as any).user?.userId
      const sessionId = getOrCreateSessionId(request, reply)

      const cart = await cartService.getCart(userId, sessionId)
      return reply.send(cart)
    } catch (err: any) {
      return reply.status(500).send({ error: err.message })
    }
  })

  // POST /cart/items — añadir producto
  app.post('/items', { preHandler: [optionalAuth] }, async (request, reply) => {
    try {
      const data = addItemSchema.parse(request.body)
      const userId = (request as any).user?.userId
      const sessionId = getOrCreateSessionId(request, reply)
      const item = await cartService.addItem(data, userId, sessionId)
      return reply.status(201).send(item)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // PATCH /cart/items/:id — actualizar cantidad
  app.patch('/items/:id', { preHandler: [optionalAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = updateItemSchema.parse(request.body)
      const userId = (request as any).user?.userId
      const sessionId = getOrCreateSessionId(request, reply)

      const item = await cartService.updateItem(id, data, userId, sessionId)
      return reply.send(item)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // DELETE /cart/items/:id — eliminar un item
  app.delete('/items/:id', { preHandler: [optionalAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const userId = (request as any).user?.userId
      const sessionId = getOrCreateSessionId(request, reply)

      await cartService.removeItem(id, userId, sessionId)
      return reply.send({ message: 'Item eliminado' })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // DELETE /cart — vaciar el carrito
  app.delete('/', { preHandler: [optionalAuth] }, async (request, reply) => {
    try {
      const userId = (request as any).user?.userId
      const sessionId = getOrCreateSessionId(request, reply)

      await cartService.clearCart(userId, sessionId)
      return reply.send({ message: 'Carrito vaciado' })
    } catch (err: any) {
      return reply.status(500).send({ error: err.message })
    }
  })

  // POST /cart/merge — fusiona carrito anónimo con el del usuario
  // Se llama justo después de hacer login desde el frontend
  app.post('/merge', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.userId
      const sessionId = request.cookies?.sessionId as string

      if (sessionId) {
        await cartService.mergeCarts(userId, sessionId)
        // Borra la cookie de sesión anónima — ya no la necesita
        reply.clearCookie('sessionId', { path: '/' })
      }

      const cart = await cartService.getCart(userId)
      return reply.send(cart)
    } catch (err: any) {
      return reply.status(500).send({ error: err.message })
    }
  })
}