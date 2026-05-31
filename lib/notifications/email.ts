import { Resend } from 'resend'

let resend: Resend | null = null

function getResend(): Resend {
  if (!resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY must be set')
    resend = new Resend(key)
  }
  return resend
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const from = process.env.EMAIL_FROM ?? 'investment@dashboard.local'
  const client = getResend()

  const { error } = await client.emails.send({ from, to, subject, html })
  if (error) throw new Error(`Resend error: ${error.message}`)
}
