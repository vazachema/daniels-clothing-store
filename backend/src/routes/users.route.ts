import { FastifyInstance } from 'fastify'
import { userService } from '../services/user.service'
import { updateProfileSchema, addressSchema } from '../schemas/user.schema'
import { requireAuth } from '../middleware/auth.middleware'


export async function usersRoute(app: FastifyInstance) {

    // GET /users/me — devuelve el perfil del usuario logueado
    app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
        try {
            // request.user lo puso el middleware requireAuth
            const user = await userService.getById(request.user!.userId)

            if (!user) {
                return reply.status(404).send({ error: 'Usuario no encontrado' })
            }

            return reply.send(user)
        } catch (err: any) {
            return reply.status(500).send({ error: err.message })
        }
    })

    app.patch('/me', { preHandler: [requireAuth] }, async (request, reply) => {
        try {
            // 1. Valida los datos que vienen en el body
            const data = updateProfileSchema.parse(request.body)

            // 2. Usa el id del usuario logueado — viene del middleware
            const updatedUser = await userService.updateProfile(request.user!.userId, data)

            return reply.send(updatedUser)
        } catch (err: any) {
            return reply.status(400).send({ error: err.message })
        }
    })

    // GET /users/me/addresses — ver direcciones guardadas
    app.get('/me/addresses', { preHandler: [requireAuth] }, async (request, reply) => {
        try {
            const addresses = await userService.getAddresses(request.user!.userId)
            return reply.send(addresses)
        } catch (err: any) {
            return reply.status(500).send({ error: err.message })
        }
    })

    // POST /users/me/addresses — guardar una dirección nueva
    app.post('/me/addresses', { preHandler: [requireAuth] }, async (request, reply) => {
        try {
            const data = addressSchema.parse(request.body)
            const address = await userService.addAddress(request.user!.userId, data)
            return reply.status(201).send(address)
        } catch (err: any) {
            return reply.status(400).send({ error: err.message })
        }
    })

    // DELETE /users/me/addresses/:id — borrar una dirección
    app.delete('/me/addresses/:id', { preHandler: [requireAuth] }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string }
            // Pasa tanto el id de la dirección como el userId
            // El service verifica que la dirección pertenece al usuario
            await userService.deleteAddress(id, request.user!.userId)
            return reply.send({ message: 'Dirección eliminada' })
        } catch (err: any) {
            return reply.status(400).send({ error: err.message })
        }
    })
}