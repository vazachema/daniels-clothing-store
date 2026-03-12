import { FastifyInstance } from 'fastify'
import { productService } from '../services/product.service'
import { createProductSchema, productQuerySchema, updateProductSchema } from '../schemas/product.schema'
import { requireAuth, requireAdmin } from '../middleware/auth.middleware'

export async function productsRoute(app: FastifyInstance) {
  // GET /products
  // Ejemplo: /products?page=1&limit=10&search=camiseta
  app.get('/', async (request, reply) => {
    try {
      const query = productQuerySchema.parse(request.query)
      const result = await productService.getAll(query)
      return reply.send(result)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // GET /products/:slug
  // Ejemplo: /products/camiseta-blanca
  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const product = await productService.getBySlug(slug)

    if (!product) {
      // 404 = "no encontrado"
      return reply.status(404).send({ error: 'Producto no encontrado' })
    }

    return reply.send(product)
  })

  // POST /products — crea un producto nuevo
  // El body debe tener el formato definido en createProductSchema
  app.post('/', {
    preHandler: [requireAuth, requireAdmin]
  }, async (request, reply) => {
    try {
      const data = createProductSchema.parse(request.body)
      const product = await productService.create(data)
      // 201 = "creado correctamente"
      return reply.status(201).send(product)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // PATCH /products/:id — actualizar producto (solo admin)
  app.patch('/:id', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = updateProductSchema.parse(request.body)
      const product = await productService.update(id, data)
      return reply.send(product)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // PATCH /products/:id/toggle — activar/desactivar producto (solo admin)
  // En e-commerce nunca borras productos — los desactivas
  // Un producto borrado rompería los OrderItems históricos que lo referencian
  app.patch('/:id/toggle', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const updated = await productService.toggleProduct(id)
      return reply.send(updated)
    } catch (err: any) {
      return reply.status(500).send({ error: err.message })
    }
  })
}