import { FastifyInstance } from 'fastify'
import { userService } from '../services/user.service'
import { updateProfileSchema } from '../schemas/user.schema'
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
}