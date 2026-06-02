'use server'

import { db } from '@/lib/db'
import { watchlist } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function removeFromWatchlist(id: string) {
  await db.delete(watchlist).where(eq(watchlist.id, id))
  revalidatePath('/watchlist')
}
