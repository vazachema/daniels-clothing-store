import '@fastify/cookie'
import { FastifyInstance } from 'fastify'
import { authService } from '../services/auth.service'
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../schemas/auth.schema'

// Configuración de la cookie del Refresh Token
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,      // JavaScript no puede leerla
  secure: process.env.NODE_ENV === 'production',  // solo HTTPS en producción
  sameSite: 'strict' as const,   // no se envía en peticiones cruzadas
  maxAge: 30 * 24 * 60 * 60,    // 30 días en segundos
  path: '/',
}

export async function authRoute(app: FastifyInstance) {

  // POST /auth/register
  app.post('/register', async (request, reply) => {
    try {
      const data = registerSchema.parse(request.body)
      const user = await authService.register(data)
      return reply.status(201).send({ user })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // POST /auth/login
  app.post('/login', async (request, reply) => {
    try {
      const data = loginSchema.parse(request.body)
      const result = await authService.login(data)

      // El Refresh Token va en una cookie httpOnly
      reply.setCookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS)

      // El Access Token va en el body — el frontend lo guardará en memoria
      return reply.send({
        accessToken: result.accessToken,
        user: result.user
      })
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  // POST /auth/refresh — obtiene nuevo Access Token
  app.post('/refresh', async (request, reply) => {
    try {
      // Lee el Refresh Token de la cookie
      const refreshToken = (request.cookies as any)?.refreshToken

      if (!refreshToken) {
        return reply.status(401).send({ error: 'No hay sesión activa' })
      }

      const result = await authService.refresh(refreshToken)

      // Actualiza la cookie con el nuevo Refresh Token
      reply.setCookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS)

      return reply.send({ accessToken: result.accessToken })
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  // POST /auth/logout
  app.post('/logout', async (request, reply) => {
    const refreshToken = (request.cookies as any)?.refreshToken

    if (refreshToken) {
      await authService.logout(refreshToken)
    }

    // Borra la cookie del navegador
    reply.clearCookie('refreshToken', { path: '/' })

    return reply.send({ message: 'Sesión cerrada correctamente' })
  })

  // POST /auth/forgot-password
  app.post('/forgot-password', async (request, reply) => {
    try {
      const data = forgotPasswordSchema.parse(request.body)
      await authService.forgotPassword(data)
      // Siempre respondemos igual — no revelamos si el email existe
      return reply.send({ message: 'Si el email existe, recibirás un enlace en breve' })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // POST /auth/reset-password
  app.post('/reset-password', async (request, reply) => {
    try {
      const data = resetPasswordSchema.parse(request.body)
      await authService.resetPassword(data)
      return reply.send({ message: 'Contraseña actualizada correctamente' })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })
}