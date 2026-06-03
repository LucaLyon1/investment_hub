'use server'

import { createHash } from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(_: unknown, formData: FormData) {
  const password = formData.get('password')?.toString() ?? ''
  const expected = process.env.DASHBOARD_PASSWORD ?? ''

  if (!expected) return { error: 'DASHBOARD_PASSWORD is not set.' }
  if (password !== expected) return { error: 'Wrong password.' }

  const token = createHash('sha256').update(password).digest('hex')
  const jar = await cookies()
  jar.set('auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  redirect('/')
}
