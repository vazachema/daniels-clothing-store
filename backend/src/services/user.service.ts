import { db } from '../lib/db'
import { UpdateProfileInput } from '../schemas/user.schema'


export const userService = {

    async getById(id: string) {
        const user = await db.user.findUnique({
            where: { id },
            // Nunca devuelves el passwordHash — ni al propio usuario
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
    async updateProfile(id: string, data: UpdateProfileInput) {
        // Verifica que el usuario existe
        const user = await this.getById(id)
        if (!user) {
            throw new Error('Usuario no encontrado')
        }

        // Actualiza y devuelve el usuario sin passwordHash
        return db.user.update({
            where: { id },
            data: { name: data.name },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            }
        })
    }
}