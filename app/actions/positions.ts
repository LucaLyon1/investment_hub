'use server'

import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { updateTag } from 'next/cache'
import { db } from '@/lib/db'
import { positions } from '@/lib/db/schema'

export type PositionFormState = {
  error?: string
  success?: boolean
}

export async function createPosition(
  _prev: PositionFormState | null,
  formData: FormData
): Promise<PositionFormState> {
  const ticker = formData.get('ticker')?.toString().toUpperCase()
  const name = formData.get('name')?.toString()
  const assetClass = formData.get('assetClass')?.toString() as 'stock' | 'etf' | 'bond' | 'commodity'
  const quantity = parseFloat(formData.get('quantity')?.toString() ?? '')
  const avgBuyPrice = parseFloat(formData.get('avgBuyPrice')?.toString() ?? '')
  const currency = formData.get('currency')?.toString() ?? 'USD'
  const notes = formData.get('notes')?.toString() ?? null

  if (!ticker || !name || !assetClass || isNaN(quantity) || isNaN(avgBuyPrice)) {
    return { error: 'All required fields must be filled in correctly.' }
  }

  const now = new Date()
  await db.insert(positions).values({
    id: nanoid(),
    ticker,
    name,
    assetClass,
    quantity,
    avgBuyPrice,
    currency,
    notes,
    createdAt: now,
    updatedAt: now,
  })

  updateTag('positions')
  return { success: true }
}

export async function updatePosition(
  id: string,
  quantity: number,
  avgBuyPrice: number,
  notes?: string
): Promise<void> {
  await db
    .update(positions)
    .set({ quantity, avgBuyPrice, notes: notes ?? null, updatedAt: new Date() })
    .where(eq(positions.id, id))
  updateTag('positions')
}

export async function deletePosition(id: string): Promise<void> {
  await db.delete(positions).where(eq(positions.id, id))
  updateTag('positions')
}
