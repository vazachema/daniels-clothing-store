import { FastifyInstance } from 'fastify'
import { orderService } from '../services/order.service'
import { createOrderSchema } from '../schemas/order.schema'
import { requireAuth } from '../middleware/auth.middleware'
import { stripe } from '../lib/stripe'
import Stripe from 'stripe'

export async function ordersRoute(app: FastifyInstance) {

    // POST /orders — crea un pedido desde el carrito
    // Solo usuarios logueados pueden comprar
    app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
        try {
            const data = createOrderSchema.parse(request.body)
            const result = await orderService.createOrder(request.user!.userId, data)
            return reply.status(201).send(result)
        } catch (err: any) {
            return reply.status(400).send({ error: err.message })
        }
    })

    // GET /orders — lista los pedidos del usuario logueado
    app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
        try {
            const orders = await orderService.getUserOrders(request.user!.userId)
            return reply.send(orders)
        } catch (err: any) {
            return reply.status(500).send({ error: err.message })
        }
    })

    // GET /orders/:id — obtiene un pedido concreto
    app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string }
            const order = await orderService.getOrderById(id, request.user!.userId)
            return reply.send(order)
        } catch (err: any) {
            return reply.status(404).send({ error: err.message })
        }
    })

    // POST /orders/webhook — Stripe avisa aquí cuando se procesa un pago
    // IMPORTANTE: esta ruta NO tiene requireAuth — la llama Stripe, no el usuario
    // La seguridad se basa en verificar la firma del webhook
    app.post('/webhook', {
        config: {
            // Fastify parsea el body como JSON por defecto
            // Stripe necesita el body RAW (sin parsear) para verificar la firma
            rawBody: true
        }
    }, async (request, reply) => {
        const signature = request.headers['stripe-signature'] as string
        let event: Stripe.Event

        try {
            // Verifica que el webhook viene realmente de Stripe
            // Si alguien intenta llamar a esta ruta manualmente, falla aquí
            event = stripe.webhooks.constructEvent(
                (request as any).rawBody,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET!
            )
        } catch {
            return reply.status(400).send({ error: 'Firma del webhook inválida' })
        }

        // Solo nos interesa el evento de pago completado
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent
            try {
                await orderService.confirmOrder(paymentIntent.id)
            } catch (err: any) {
                // Logueamos el error pero respondemos 200 a Stripe
                // Si respondemos 4xx/5xx, Stripe reintentará el webhook indefinidamente
                app.log.error('Error confirmando pedido:', err.message)
            }
        }

        // Siempre responde 200 a Stripe para confirmar que recibiste el evento
        return reply.send({ received: true })
    })
}