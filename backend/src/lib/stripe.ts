import Stripe from 'stripe'

// Crea una instancia de Stripe con tu secret key
// Esta instancia la usarás en todo el proyecto
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover'  // versión fija — así no te rompe si Stripe actualiza
})