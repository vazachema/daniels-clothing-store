import { FastifyInstance } from 'fastify'
import { categoryService } from '../services/category.service'
import { createCategorySchema } from '../schemas/category.schema'

export async function categoriesRoute(app: FastifyInstance) {

  // GET /categories
  app.get('/', async (request, reply) => {
    try {
      const categories = await categoryService.getAll()
      return reply.send(categories)
    } catch (err: any) {
      // 500 = error interno del servidor (algo que no esperabas)
      return reply.status(500).send({ error: err.message })
    }
  })

  // POST /categories
  app.post('/', async (request, reply) => {
    try {
      // 1. Valida los datos con Zod
      const data = createCategorySchema.parse(request.body)

      // 2. Llama al servicio
      const category = await categoryService.create(data)

      // 3. Responde con 201 (creado) y los datos de la categoría
      return reply.status(201).send(category)

    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })
}