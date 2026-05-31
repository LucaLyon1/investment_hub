import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { updateTag } from 'next/cache'
import { db } from '@/lib/db'
import { aiIdeas } from '@/lib/db/schema'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { status } = await req.json()

  if (!['approved', 'dismissed'].includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 })
  }

  const updated = await db
    .update(aiIdeas)
    .set({ status, actedAt: new Date() })
    .where(eq(aiIdeas.id, id))
    .returning()

  if (!updated.length) return Response.json({ error: 'Not found' }, { status: 404 })
  updateTag('ideas')
  return Response.json(updated[0])
}
