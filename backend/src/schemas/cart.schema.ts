import { z } from 'zod'

export const addItemSchema = z.object({
  variantId: z.uuid('ID de variante no válido'),
  quantity: z.number().int().min(1, 'La cantidad mínima es 1').max(10, 'Máximo 10 unidades por producto'),
})

export const updateItemSchema = z.object({
  quantity: z.number().int().min(1, 'La cantidad mínima es 1').max(10, 'Máximo 10 unidades'),
})

export type AddItemInput = z.infer<typeof addItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>