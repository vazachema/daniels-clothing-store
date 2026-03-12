import nodemailer from 'nodemailer'

// Crea el transportador de email — la conexión con el servidor SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,   // false para puerto 587 (TLS), true para 465 (SSL)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// Envía el email de recuperación de contraseña
export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string
) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: 'Recupera tu contraseña',
    // Versión texto plano (para clientes de email que no soportan HTML)
    text: `Haz clic en este enlace para recuperar tu contraseña: ${resetUrl}. Expira en 1 hora.`,
    // Versión HTML
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Recupera tu contraseña</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        <a href="${resetUrl}" 
           style="background: #000; color: #fff; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          Restablecer contraseña
        </a>
        <p style="color: #666; margin-top: 16px;">
          Este enlace expira en 1 hora. Si no solicitaste esto, ignora este email.
        </p>
      </div>
    `,
  })
}

export async function sendOrderConfirmationEmail(
  toEmail: string,
  orderId: string,
  total: number
) {
  const orderUrl = `${process.env.FRONTEND_URL}/account/orders/${orderId}`
  console.log("¡Pedido confirmado! 🎉")
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: '¡Pedido confirmado! 🎉',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>¡Tu pedido ha sido confirmado!</h2>
        <p>Hemos recibido tu pago correctamente.</p>
        <p><strong>Total:</strong> ${total.toFixed(2)}€</p>
        <a href="${orderUrl}"
           style="background: #000; color: #fff; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; display: inline-block;
                  margin-top: 16px;">
          Ver mi pedido
        </a>
        <p style="color: #666; margin-top: 16px; font-size: 12px;">
          ID del pedido: ${orderId}
        </p>
      </div>
    `,
  })
}