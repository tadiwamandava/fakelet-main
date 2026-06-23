//to be changed in the future to use a proper email service
import nodemailer from 'nodemailer'
import env from '#start/env'

function makeTransporter() {
  const host = env.get('SMTP_HOST')
  if (!host) return null
  return nodemailer.createTransport({
    host,
    port: env.get('SMTP_PORT', 587),
    secure: env.get('SMTP_PORT', 587) === 465,
    auth: {
      user: env.get('SMTP_USERNAME'),
      pass: env.get('SMTP_PASSWORD'),
    },
  })
}

const transporter = makeTransporter()

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  if (!transporter) {
    // No SMTP configured — print to console so devs can still test the flow
    console.log(`\n[MAIL] Password reset code for ${to}: ${code}\n`)
    return
  }

  const from = env.get('SMTP_FROM', 'no-reply@tadiwa.org')

  await transporter.sendMail({
    from,
    to,
    subject: 'Your K20 Fakelet password reset code',
    text: `Your password reset code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#231F20">
        <h2 style="color:#910D28;margin-bottom:4px">Password Reset</h2>
        <p style="color:#626262;margin-top:0">K20 Center Fakelet</p>
        <p>Use the code below to reset your password. It expires in <strong>15 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#231F20;padding:20px;background:#f7f7f7;border-radius:8px;text-align:center;margin:20px 0;border:1px solid #e2e2e2">
          ${code}
        </div>
        <p style="color:#626262;font-size:13px">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  })
}
