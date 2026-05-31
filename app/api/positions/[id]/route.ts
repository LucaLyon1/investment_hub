import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { positions } from '@/lib/db/schema'
import { updateTag } from 'next/cache'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pos = await db.select().from(positions).where(eq(positions.id, id)).get()
  if (!pos) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(pos)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const updated = await db
    .update(positions)
    .set({
      quantity: body.quantity,
      avgBuyPrice: body.avgBuyPrice,
      notes: body.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(positions.id, id))
    .returning()

  if (!updated.length) return Response.json({ error: 'Not found' }, { status: 404 })
  updateTag('positions')
  return Response.json(updated[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.delete(positions).where(eq(positions.id, id))
  updateTag('positions')
  return new Response(null, { status: 204 })
}
