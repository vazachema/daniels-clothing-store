import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede tener más de 50 caracteres'),
})

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(50).optional(),
})

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
