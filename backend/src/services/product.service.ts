import { db } from '../lib/db'
import { CreateProductInput, ProductQuery } from '../schemas/product.schema'

export const productService = {

  // Devuelve lista de productos con paginación y filtros opcionales
  async getAll(query: ProductQuery) {
    const { categoryId, page, limit, search } = query
    const skip = (page - 1) * limit   // si page=2 y limit=20, saltamos los primeros 20

    // Construye el filtro dinámicamente según los parámetros recibidos
    const where = {
      isActive: true,                  // solo productos activos
      ...(categoryId && { categoryId }),   // si viene categoryId, filtra por él
      ...(search && {                      // si viene search, busca en nombre y descripción
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    // Promise.all ejecuta las dos consultas a la vez en paralelo
    // más rápido que hacerlas una detrás de otra
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,             // cuántos saltarse (para la paginación)
        take: limit,      // cuántos traer
        include: {        // datos relacionados que quieres incluir
          category: { select: { name: true, slug: true } },  // solo estos campos de category
          images: { orderBy: { position: 'asc' }, take: 1 }, // solo la primera imagen
          variants: { select: { size: true, color: true, stock: true } },
        },
        orderBy: { createdAt: 'desc' },   // más recientes primero
      }),
      db.product.count({ where }),        // total de resultados (para calcular páginas)
    ])

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    }
  },

  // Devuelve un producto concreto por su slug
  // El slug es la versión URL del nombre: "Camiseta Blanca" → "camiseta-blanca"
  async getBySlug(slug: string) {
    const product = await db.product.findUnique({
      where: { slug, isActive: true },
      include: {
        category: true,
        images: { orderBy: { position: 'asc' } },  // todas las imágenes ordenadas
        variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
      },
    })
    
    return product   // null si no existe — la ruta manejará el 404
  },

  // Crea un producto nuevo con sus variantes
  async create(data: CreateProductInput) {
    // Genera el slug automáticamente desde el nombre
    const slug = data.name
      .toLowerCase()
      .normalize('NFD')                        // separa letras de acentos
      .replace(/[\u0300-\u036f]/g, '')         // elimina los acentos
      .replace(/[^a-z0-9]+/g, '-')            // reemplaza espacios y símbolos por guiones
      .replace(/(^-|-$)/g, '')                 // elimina guiones al inicio y final

    // Verifica que no existe ya un producto con ese slug
    const existing = await db.product.findUnique({ where: { slug } })
    if (existing) {
      throw new Error(`Ya existe un producto con el slug "${slug}"`)
    }

    // Crea el producto y sus variantes en una sola transacción
    // Si algo falla, no se guarda nada (todo o nada)
    return db.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        basePrice: data.basePrice,
        categoryId: data.categoryId,
        variants: {
          create: data.variants,    // crea todas las variantes a la vez
        },
      },
      include: { variants: true },
    })
  },
}