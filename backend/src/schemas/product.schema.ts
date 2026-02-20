import { z } from 'zod'

// z.object define la forma que deben tener los datos
// Si algo no cumple estas reglas, Zod lo rechaza automáticamente
// antes de que llegue a tu base de datos

export const createProductSchema = z.object({
  name: z.string().min(2).max(100),          // texto, entre 2 y 100 caracteres
  description: z.string().min(10),            // texto, mínimo 10 caracteres
  basePrice: z.number().positive(),           // número positivo (ej: 29.99)
  categoryId: z.uuid(),                       // debe ser un UUID válido
  variants: z.array(z.object({               // array de variantes (tallas/colores)
    sku: z.string().min(3),                  // código único del producto
    size: z.enum(['XS','S','M','L','XL','XXL']),  // solo estos valores permitidos
    color: z.string(),
    stock: z.number().int().min(0),          // entero, no puede ser negativo
    priceModifier: z.number().default(0),    // extra sobre el precio base
  })).min(1),                                // al men  os una variante
})

export const productQuerySchema = z.object({
  categoryId: z.uuid().optional(),  // filtro opcional por categoría
  page: z.coerce.number().int().positive().default(1),   // z.coerce convierte "1" (string) a 1 (número)
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().optional(),
})

// Estos tipos los usarás en TypeScript para que el editor
// sepa exactamente qué forma tienen tus datos
export type CreateProductInput = z.infer<typeof createProductSchema>
export type ProductQuery = z.infer<typeof productQuerySchema>