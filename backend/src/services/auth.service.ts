import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from '../lib/db'
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '../lib/jwt'
import { sendPasswordResetEmail } from '../lib/email'
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '../schemas/auth.schema'

export const authService = {

  // REGISTRO — crea un usuario nuevo
  async register(data: RegisterInput) {
    // 1. Verifica que el email no existe ya
    const existing = await db.user.findUnique({ where: { email: data.email } })
    if (existing) {
      throw new Error('Ya existe una cuenta con ese email')
    }

    // 2. Hashea la contraseña
    // El 12 es el "cost factor" — cuántas veces aplica el algoritmo
    // Más alto = más seguro pero más lento. 12 es el estándar recomendado
    const passwordHash = await bcrypt.hash(data.password, 12)

    // 3. Crea el usuario en la base de datos
    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
      // select especifica qué campos devolver — nunca devuelves passwordHash
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    })

    return user
  },

  // LOGIN — verifica credenciales y devuelve los tokens
  async login(data: LoginInput) {
    // 1. Busca el usuario por email
    const user = await db.user.findUnique({ where: { email: data.email } })

    // IMPORTANTE: si el usuario no existe, damos el mismo error que si la
    // contraseña es incorrecta. Nunca reveles si el email existe o no —
    // eso daría información a un atacante
    if (!user) {
      throw new Error('Credenciales incorrectas')
    }

    // 2. Verifica la contraseña contra el hash guardado
    const passwordValid = await bcrypt.compare(data.password, user.passwordHash)
    if (!passwordValid) {
      throw new Error('Credenciales incorrectas')
    }

    // 3. Crea los dos tokens
    const tokenPayload = { userId: user.id, role: user.role }
    const accessToken = createAccessToken(tokenPayload)
    const refreshToken = createRefreshToken(tokenPayload)

    // 4. Guarda el Refresh Token en la base de datos
    // Expira en 30 días — calculamos la fecha exacta
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await db.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      }
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    }
  },

  // REFRESH — obtiene un nuevo Access Token usando el Refresh Token
  async refresh(refreshToken: string) {
    // 1. Verifica que el token es válido criptográficamente
    let payload
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch {
      throw new Error('Refresh token inválido o expirado')
    }

    // 2. Verifica que existe en la base de datos y no ha expirado
    const storedToken = await db.refreshToken.findUnique({
      where: { token: refreshToken }
    })

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new Error('Sesión expirada, vuelve a hacer login')
    }

    // 3. Rotación — borra el token usado y crea uno nuevo
    // Así si alguien robó el token, al usarlo tú primero lo invalidas
    await db.refreshToken.delete({ where: { token: refreshToken } })

    const newRefreshToken = createRefreshToken({
      userId: payload.userId,
      role: payload.role
    })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await db.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: payload.userId,
        expiresAt,
      }
    })

    // 4. Devuelve el nuevo Access Token y el nuevo Refresh Token
    const newAccessToken = createAccessToken({
      userId: payload.userId,
      role: payload.role
    })

    return { accessToken: newAccessToken, refreshToken: newRefreshToken }
  },

  // LOGOUT — invalida la sesión borrando el Refresh Token de la DB
  async logout(refreshToken: string) {
    // Borra el token — si no existe, no pasa nada (ya estaba deslogueado)
    await db.refreshToken.deleteMany({ where: { token: refreshToken } })
  },

  // FORGOT PASSWORD — envía email de recuperación
  async forgotPassword(data: ForgotPasswordInput) {
    const user = await db.user.findUnique({ where: { email: data.email } })

    // IMPORTANTE: aunque el email no exista, respondemos igual
    // Para no revelar si un email está registrado en tu plataforma
    if (!user) return

    // Genera un token aleatorio — no es JWT, es solo un string único
    const token = crypto.randomBytes(32).toString('hex')

    // Expira en 1 hora
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    // Invalida tokens anteriores del mismo usuario
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true }
    })

    // Guarda el nuevo token en la DB
    await db.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt }
    })

    // Envía el email
    await sendPasswordResetEmail(user.email, token)
  },

  // RESET PASSWORD — cambia la contraseña usando el token del email
  async resetPassword(data: ResetPasswordInput) {
    // 1. Busca el token en la DB
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token: data.token }
    })

    // 2. Verifica que es válido: existe, no fue usado, y no expiró
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw new Error('Token inválido o expirado')
    }

    // 3. Hashea la nueva contraseña
    const passwordHash = await bcrypt.hash(data.newPassword, 12)

    // 4. Actualiza la contraseña y marca el token como usado
    // Usamos una transacción — las dos operaciones ocurren juntas o ninguna
    await db.$transaction([
      db.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      }),
      // Borra todos los refresh tokens del usuario
      // Si alguien tenía acceso, lo perdió al cambiar contraseña
      db.refreshToken.deleteMany({
        where: { userId: resetToken.userId }
      }),
    ])
  },
}