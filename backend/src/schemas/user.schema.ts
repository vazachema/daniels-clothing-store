import { z } from 'zod'

export const updateProfileSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50),
})

export const addressSchema = z.object({
  street: z.string().min(5),
  city: z.string().min(2),
  province: z.string().min(2),
  postalCode: z.string().regex(/^\d{5}$/, 'Código postal debe tener 5 dígitos'),
  country: z.string().default('ES'),
  isDefault: z.boolean().default(false),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type AddressInput = z.infer<typeof addressSchema>
