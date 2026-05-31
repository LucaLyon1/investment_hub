import { headers } from 'next/headers'
import { verifyCronSecret } from '@/lib/utils/auth'
import { runMorningRecap } from '@/lib/notifications/recap'

export async function POST() {
  const headerStore = await headers()
  const auth = headerStore.get('authorization')

  if (!verifyCronSecret(auth)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await runMorningRecap()
    return Response.json({ ok: true })
  } catch (err) {
    console.error('Morning recap failed:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
