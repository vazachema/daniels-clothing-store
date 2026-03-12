import { z } from 'zod'

// Lo que el usuario envía al crear un pedido
export const createOrderSchema = z.object({
  shippingAddress: z.object({
    name: z.string().min(2, 'El nombre es obligatorio'),
    street: z.string().min(5, 'La dirección es obligatoria'),
    city: z.string().min(2, 'La ciudad es obligatoria'),
    province: z.string().min(2, 'La provincia es obligatoria'),
    postalCode: z.string().regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos'),
    country: z.string().default('ES'),
    phone: z.string().min(9, 'El teléfono es obligatorio'),
  }),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>