import { db } from '../lib/db'
import { AddItemInput, UpdateItemInput } from '../schemas/cart.schema'
import crypto from 'crypto'

export const cartService = {

    // Obtiene o crea el carrito
    // Si el usuario está logueado busca por userId
    // Si es anónimo busca por sessionId
    async getOrCreateCart(userId?: string, sessionId?: string) {
        // Busca un carrito existente
        const existingCart = await db.cart.findFirst({
            where: userId ? { userId } : { sessionId },
        })

        if (existingCart) return existingCart

        // Si no existe, crea uno nuevo
        // Los carritos anónimos expiran en 7 días
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        return db.cart.create({
            data: {
                userId: userId || null,
                sessionId: sessionId || null,
                expiresAt: userId ? null : expiresAt,  // los carritos de usuarios no expiran
            }
        })
    },

    // Devuelve el carrito completo con todos sus items y datos de producto
    async getCart(userId?: string, sessionId?: string) {
        const cart = await db.cart.findFirst({
            where: userId ? { userId } : { sessionId },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                        slug: true,
                                        basePrice: true,
                                        images: {
                                            take: 1,   // solo la primera imagen
                                            orderBy: { position: 'asc' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!cart) return { items: [], total: 0 }

        // Calcula el total sumando precio base + modificador de cada variante
        const total = cart.items.reduce((sum, item) => {
            const basePrice = Number(item.variant.product.basePrice)
            const modifier = Number(item.variant.priceModifier)
            return sum + (basePrice + modifier) * item.quantity
        }, 0)

        return { ...cart, total: Math.round(total * 100) / 100 }
    },

    // Añade un producto al carrito
    async addItem(data: AddItemInput, userId?: string, sessionId?: string) {
        // 1. Verifica que la variante existe y tiene stock
        const variant = await db.productVariant.findUnique({
            where: { id: data.variantId },
            include: { product: true }
        })

        if (!variant) {
            throw new Error('Producto no encontrado')
        }

        if (!variant.product.isActive) {
            throw new Error('Este producto no está disponible')
        }

        if (variant.stock === 0) {
            throw new Error(`No quedan unidades disponibles`)
        } else if (variant.stock < data.quantity) {
            throw new Error(`Solo quedan ${variant.stock} unidades disponibles`)
        }

        // 2. Obtiene o crea el carrito
        const cart = await this.getOrCreateCart(userId, sessionId)

        // 3. Verifica si la variante ya está en el carrito
        const existingItem = await db.cartItem.findUnique({
            where: {
                cartId_variantId: {   // índice único que definimos en el schema
                    cartId: cart.id,
                    variantId: data.variantId,
                }
            }
        })

        if (existingItem) {
            // Si ya existe, suma la cantidad
            const newQuantity = existingItem.quantity + data.quantity

            if (variant.stock === 0) {
                throw new Error(`No quedan unidades disponibles`)
            } else if (variant.stock < data.quantity) {
                throw new Error(`Solo quedan ${variant.stock} unidades disponibles`)
            }

            return db.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: newQuantity }
            })
        }

        // Si no existe, crea el item
        return db.cartItem.create({
            data: {
                cartId: cart.id,
                variantId: data.variantId,
                quantity: data.quantity,
            }
        })
    },

    // Actualiza la cantidad de un item
    async updateItem(itemId: string, data: UpdateItemInput, userId?: string, sessionId?: string) {
        // Verifica que el item pertenece al carrito de este usuario
        // Seguridad importante — sin esto cualquiera podría modificar items ajenos
        const item = await db.cartItem.findFirst({
            where: {
                id: itemId,
                cart: userId ? { userId } : { sessionId }
            },
            include: { variant: true }
        })

        if (!item) {
            throw new Error('Item no encontrado')
        }

        if (data.quantity > item.variant.stock) {
            throw new Error(`Solo quedan ${item.variant.stock} unidades disponibles`)
        }

        return db.cartItem.update({
            where: { id: itemId },
            data: { quantity: data.quantity }
        })
    },

    // Elimina un item del carrito
    async removeItem(itemId: string, userId?: string, sessionId?: string) {
        // Igual que updateItem — verifica que el item es de este usuario
        const item = await db.cartItem.findFirst({
            where: {
                id: itemId,
                cart: userId ? { userId } : { sessionId }
            }
        })

        if (!item) {
            throw new Error('Item no encontrado')
        }

        return db.cartItem.delete({ where: { id: itemId } })
    },

    // Vacía el carrito
    async clearCart(userId?: string, sessionId?: string) {
        const cart = await db.cart.findFirst({
            where: userId ? { userId } : { sessionId }
        })

        if (!cart) return

        await db.cartItem.deleteMany({ where: { cartId: cart.id } })
    },

    // Fusiona el carrito anónimo con el del usuario al hacer login
    async mergeCarts(userId: string, sessionId: string) {
        const anonymousCart = await db.cart.findFirst({
            where: { sessionId },
            include: { items: true }
        })

        // Si no hay carrito anónimo no hay nada que fusionar
        if (!anonymousCart || anonymousCart.items.length === 0) return

        // Obtiene o crea el carrito del usuario logueado
        const userCart = await this.getOrCreateCart(userId)

        // Mueve cada item del carrito anónimo al carrito del usuario
        for (const item of anonymousCart.items) {
            const existingItem = await db.cartItem.findUnique({
                where: {
                    cartId_variantId: {
                        cartId: userCart.id,
                        variantId: item.variantId,
                    }
                }
            })

            if (existingItem) {
                // Si el producto ya está en el carrito del usuario, suma cantidades
                await db.cartItem.update({
                    where: { id: existingItem.id },
                    data: { quantity: existingItem.quantity + item.quantity }
                })
            } else {
                // Si no está, mueve el item al carrito del usuario
                await db.cartItem.update({
                    where: { id: item.id },
                    data: { cartId: userCart.id }
                })
            }
        }

        // Borra el carrito anónimo ya vacío
        await db.cart.delete({ where: { id: anonymousCart.id } })
    },
}