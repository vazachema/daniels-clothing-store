import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede tener más de 50 caracteres'),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
