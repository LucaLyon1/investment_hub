'use server'

import { db } from '@/lib/db'
import { watchlist, positions, marketDataCache } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'

export async function refreshWatchlistData(): Promise<void> {
  const items = await db.select({ ticker: watchlist.ticker }).from(watchlist)
  if (items.length === 0) return
  const tickers = items.map((i) => i.ticker)
  await db.delete(marketDataCache).where(inArray(marketDataCache.ticker, tickers))
  revalidatePath('/watchlist')
}

export async function removeFromWatchlist(id: string) {
  const [item] = await db.select({ ticker: watchlist.ticker }).from(watchlist).where(eq(watchlist.id, id))
  await db.delete(watchlist).where(eq(watchlist.id, id))

  if (item) {
    const inPortfolio = await db
      .select({ ticker: positions.ticker })
      .from(positions)
      .where(eq(positions.ticker, item.ticker))
      .limit(1)

    if (inPortfolio.length === 0) {
      await db.delete(marketDataCache).where(eq(marketDataCache.ticker, item.ticker))
    }
  }

  revalidatePath('/watchlist')
}

export interface AiEnrichment {
  reason: string | null
  keywords: string[]
}

export async function generateAiReason(
  id: string,
  ticker: string,
  name: string | null,
  source: string | null
): Promise<AiEnrichment> {
  if (!source) return { reason: null, keywords: [] }

  const client = new Anthropic()
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `You are a concise financial analyst. A user added ${ticker}${name ? ` (${name})` : ''} to their watchlist with this note: "${source}".

Return a JSON object with exactly two fields:
- "reason": 1-2 sentences explaining why they might watch this ticker, specific to the note. No intro phrases.
- "keywords": 3-5 short labels that describe the stock at a glance. Mix categories freely: market cap (e.g. "Large Cap", "Small Cap"), sector (e.g. "Tech", "Biotech", "Energy"), narrative (e.g. "AI Play", "Dividend", "Turnaround", "FDA Catalyst"), asset type (e.g. "ETF", "REIT"). Pick what's most useful.

Respond with only the JSON, no markdown.`,
      },
    ],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : null
  if (!raw) return { reason: null, keywords: [] }

  let reason: string | null = null
  let keywords: string[] = []

  try {
    const parsed = JSON.parse(raw)
    reason = parsed.reason ?? null
    keywords = Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : []
  } catch {
    reason = raw
  }

  await db
    .update(watchlist)
    .set({ aiReason: reason, keywords: keywords.length ? JSON.stringify(keywords) : null })
    .where(eq(watchlist.id, id))

  return { reason, keywords }
}
