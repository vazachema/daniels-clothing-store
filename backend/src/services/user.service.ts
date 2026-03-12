import { db } from '../lib/db'
import { UpdateProfileInput, AddressInput } from '../schemas/user.schema'


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
    },
    async getAddresses(userId: string) {
        return db.address.findMany({
            where: { userId },
            orderBy: { isDefault: 'desc' }
        })
    },

    async addAddress(userId: string, data: AddressInput) {
        return db.address.create({
            data: { ...data, userId }
        })
    },

    async deleteAddress(addressId: string, userId: string) {
        // Verifica que la dirección existe Y pertenece a este usuario
        // Sin esta verificación, cualquier usuario podría borrar direcciones ajenas
        const address = await db.address.findFirst({
            where: { id: addressId, userId }
        })

        if (!address) {
            throw new Error('Dirección no encontrada')
        }

        return db.address.delete({ where: { id: addressId } })
    },
}