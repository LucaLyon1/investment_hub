'use server'

import { sql } from 'drizzle-orm'
import { refresh } from 'next/cache'
import { db } from '@/lib/db'
import { positions, priceCache } from '@/lib/db/schema'
import { getMarketProvider } from '@/lib/market'

export async function refreshPrices(): Promise<void> {
  const rows = await db.select({ ticker: positions.ticker }).from(positions)
  if (rows.length === 0) return

  const tickers = [...new Set(rows.map((r) => r.ticker))]
  const provider = getMarketProvider()
  const quotes = await provider.getQuotes(tickers)

  await db
    .insert(priceCache)
    .values(
      quotes.map((q) => ({
        ticker: q.ticker,
        price: q.price,
        change1d: q.change1d,
        changePct1d: q.changePct1d,
        fetchedAt: new Date(),
      }))
    )
    .onConflictDoUpdate({
      target: priceCache.ticker,
      set: {
        price: sql`excluded.price`,
        change1d: sql`excluded.change_1d`,
        changePct1d: sql`excluded.change_pct_1d`,
        fetchedAt: sql`excluded.fetched_at`,
      },
    })

  refresh()
}
