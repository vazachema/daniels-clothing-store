import { db } from '../lib/db'
import { CreateCategoryInput } from '../schemas/category.schema'

export const categoryService = {

  // Lee todas las categorías de la base de datos
  async getAll() {
    return db.category.findMany({
      orderBy: { name: 'asc' },  // alfabético
      include: {
        // Cuenta cuántos productos tiene cada categoría
        // _count es una feature de Prisma para contar relaciones
        _count: {
          select: { products: true }
        }
      }
    })
    // SQL equivalente:
    // SELECT c.*, COUNT(p.id) as products_count
    // FROM categories c
    // LEFT JOIN products p ON p.category_id = c.id
    // GROUP BY c.id
    // ORDER BY c.name ASC;
  },

  // Crea una categoría nueva
  async create(data: CreateCategoryInput) {
    // Genera el slug igual que con productos
    const slug = data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Verifica que no existe ya una con ese slug
    const existing = await db.category.findUnique({ where: { slug } })
    if (existing) {
      throw new Error(`Ya existe una categoría con el nombre "${data.name}"`)
    }

    // Crea la categoría
    return db.category.create({
      data: {
        name: data.name,
        slug,
      }
    })
    // SQL equivalente:
    // INSERT INTO categories (id, name, slug)
    // VALUES (gen_random_uuid(), 'Camisetas', 'camisetas');
  },
}