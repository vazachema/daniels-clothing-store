import { FastifyInstance } from 'fastify'
import { productService } from '../services/product.service'
import { createProductSchema, productQuerySchema } from '../schemas/product.schema'

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
  app.post('/', async (request, reply) => {
    try {
      const data = createProductSchema.parse(request.body)
      const product = await productService.create(data)
      // 201 = "creado correctamente"
      return reply.status(201).send(product)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })
}