import { z } from 'zod'

/* export const createUserSchema = z.object({
    email: z.email(),
    paswordHash: z.hash(),
    name: z.string().min(2).max(20),
    addresses: z.array(z.object({
        street: z.string().min(2).max(30),
        city: z.string().min(2).max(30),
        province: z.string().min(2).max(30),
        postalCode: z.string().min(3).max(10),
        coutry: z.string().min(2).max(20)
    }))
}) */

export const updateProfileSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>