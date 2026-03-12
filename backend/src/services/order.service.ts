import { db } from '../lib/db'
import { stripe } from '../lib/stripe'
import { CreateOrderInput } from '../schemas/order.schema'
import { sendOrderConfirmationEmail } from '../lib/email'

export const orderService = {

    // Crea el pedido y el PaymentIntent de Stripe
    async createOrder(userId: string, data: CreateOrderInput) {
        // Verifica que no exsita un Order anterior
        const existingPendingOrder = await db.order.findFirst({
            where: {
                userId,
                status: 'PENDING',
            }
        })

        if (existingPendingOrder) {
            // Recupera el PaymentIntent de Stripe para obtener el clientSecret
            // El clientSecret puede reutilizarse — Stripe lo permite
            const paymentIntent = await stripe.paymentIntents.retrieve(
                existingPendingOrder.stripePaymentId!
            )

            return {
                orderId: existingPendingOrder.id,
                clientSecret: paymentIntent.client_secret,
                total: Number(existingPendingOrder.total),
                resumed: true,   // le dices al frontend que es un pedido existente
            }
        }

        // 1. Obtiene el carrito del usuario con todos sus productos
        const cart = await db.cart.findFirst({
            where: { userId },
            include: {
                items: {
                    include: {
                        variant: {
                            include: { product: true }
                        }
                    }
                }
            }
        })

        if (!cart || cart.items.length === 0) {
            console.log(cart?.id)
            throw new Error('El carrito está vacío')
        }

        // 2. Verifica stock de cada item y calcula el total
        // El total SIEMPRE se calcula en el servidor
        // Nunca confíes en un precio que venga del frontend
        let total = 0
        const orderItems = []

        for (const item of cart.items) {
            const variant = item.variant

            if (variant.stock < item.quantity) {
                throw new Error(
                    `Stock insuficiente para ${variant.product.name} talla ${variant.size}`
                )
            }

            const unitPrice = Number(variant.product.basePrice) + Number(variant.priceModifier)
            total += unitPrice * item.quantity
            console.log("\nTotal: ", total)
            orderItems.push({
                variantId: variant.id,
                quantity: item.quantity,
                unitPrice,
                // Snapshot — guardamos el nombre/talla/color en el momento de la compra
                // Si mañana cambias el nombre del producto, el pedido histórico no cambia
                snapshotName: variant.product.name,
                snapshotSize: variant.size,
                snapshotColor: variant.color,
            })
        }

        // Redondea a 2 decimales para evitar errores de coma flotante
        total = Math.round(total * 100) / 100

        // 3. Crea el pedido en DB con estado PENDING
        const order = await db.order.create({
            data: {
                userId,
                total,
                shippingAddress: data.shippingAddress,
                status: 'PENDING',
                items: { create: orderItems }
            },
            include: { items: true }
        })

        // 4. Crea el PaymentIntent en Stripe
        // amount va en céntimos — Stripe no acepta decimales
        // 29.99€ = 2999 céntimos
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(total * 100),
            currency: 'eur',
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never',
            },
            metadata: {
                orderId: order.id,    // guardamos el orderId para usarlo en el webhook
                userId,
            },
        })

        // 5. Guarda el stripePaymentId en el pedido
        await db.order.update({
            where: { id: order.id },
            data: { stripePaymentId: paymentIntent.id }
        })

        // 6. Devuelve el clientSecret al frontend
        // El frontend lo necesita para mostrar el formulario de pago de Stripe
        return {
            orderId: order.id,
            clientSecret: paymentIntent.client_secret,
            total,
        }
    },

    // Confirma el pedido después de que Stripe avise por webhook
    async confirmOrder(stripePaymentId: string) {
        const order = await db.order.findUnique({
            where: { stripePaymentId: stripePaymentId },
            include: {
                items: {
                    include: { variant: true }
                },
                user: true,
            }
        })

        if (!order) {
            throw new Error(`Pedido no encontrado para payment ${stripePaymentId}`)
        }

        // Usa una transacción — todas estas operaciones ocurren juntas o ninguna
        await db.$transaction([
            // 1. Actualiza el estado del pedido a PAID
            db.order.update({
                where: { id: order.id },
                data: { status: 'PAID' }
            }),

            // 2. Descuenta el stock de cada variante
            ...order.items.map(item =>
                db.productVariant.update({
                    where: { id: item.variantId },
                    data: { stock: { decrement: item.quantity } }
                    // decrement es un helper de Prisma — hace stock = stock - quantity
                    // es atómico, evita el problema de stock negativo por peticiones simultáneas
                })
            ),

            // 3. Vacía el carrito
            db.cartItem.deleteMany({
                where: { cart: { userId: order.userId } }
            }),
        ])

        // 4. Envía email de confirmación (fuera de la transacción — si falla el email no deshace el pedido)
        await sendOrderConfirmationEmail(order.user.email, order.id, Number(order.total))
    },

    // Lista los pedidos de un usuario
    async getUserOrders(userId: string) {
        return db.order.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: {
                                    select: { name: true, images: { take: 1 } }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
    },

    // Obtiene un pedido concreto — verifica que pertenece al usuario
    async getOrderById(orderId: string, userId: string) {
        const order = await db.order.findFirst({
            where: { id: orderId, userId },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: {
                                    select: { name: true, slug: true, images: { take: 1 } }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!order) throw new Error('Pedido no encontrado')
        return order
    },
}