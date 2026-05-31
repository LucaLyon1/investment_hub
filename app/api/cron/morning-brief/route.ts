import { headers } from 'next/headers'
import { verifyCronSecret } from '@/lib/utils/auth'
import { runMorningBrief } from '@/lib/notifications/morning-brief'

export async function POST() {
  const headerStore = await headers()
  const auth = headerStore.get('authorization')

  if (!verifyCronSecret(auth)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await runMorningBrief()
    return Response.json({ ok: true })
  } catch (err) {
    console.error('Morning brief failed:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
