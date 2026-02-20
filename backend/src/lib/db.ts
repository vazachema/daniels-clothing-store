import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

// Esta variable global evita crear múltiples conexiones cuando
// nodemon reinicia el servidor en desarrollo
declare global {
  var prisma: PrismaClient | undefined
}

export const db = global.prisma || new PrismaClient({
  log: ['query', 'error'],
})

if (process.env.NODE_ENV !== 'production') {
  global.prisma = db
}