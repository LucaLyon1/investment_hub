'use server'

import { db } from '@/lib/db'
import { watchlist } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'

export async function removeFromWatchlist(id: string) {
  await db.delete(watchlist).where(eq(watchlist.id, id))
  revalidatePath('/watchlist')
}

export async function generateAiReason(
  id: string,
  ticker: string,
  name: string | null,
  source: string | null
): Promise<string | null> {
  if (!source) return null

  const client = new Anthropic()
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `You are a concise financial analyst. A user added ${ticker}${name ? ` (${name})` : ''} to their watchlist based on this note: "${source}". Write 1-2 sentences explaining why they might want to watch this ticker. Be specific to the note, not generic. No intro phrases.`,
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : null
  if (text) {
    await db.update(watchlist).set({ aiReason: text }).where(eq(watchlist.id, id))
  }
  return text
}
