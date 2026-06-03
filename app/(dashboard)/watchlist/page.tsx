export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { watchlist } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { getMarketDataBatch } from '@/lib/market/cache'
import { generateAiReason } from '@/app/actions/watchlist'
import { WatchlistGrid } from '@/components/watchlist/WatchlistGrid'
import type { WatchlistCardData } from '@/components/watchlist/WatchlistGrid'

export default async function WatchlistPage() {
  const items = await db.select().from(watchlist).orderBy(desc(watchlist.addedAt))

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Watchlist</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Tickers extracted from messages you send to your Telegram bot.
          </p>
        </div>
        <p className="text-sm text-zinc-400 italic">
          No tickers yet. Send any message with $TICKER symbols to your Telegram bot to get started.
        </p>
      </div>
    )
  }

  const tickers = items.map((item) => item.ticker)

  const needsEnrichment = items.filter((item) => !item.aiReason && item.source)
  const enrichmentPromises = needsEnrichment.map((item) =>
    generateAiReason(item.id, item.ticker, item.name ?? null, item.source ?? null)
  )

  const [marketData, enrichments] = await Promise.all([
    getMarketDataBatch(tickers),
    Promise.allSettled(enrichmentPromises),
  ])

  // Merge freshly generated enrichment back onto items
  let enrichIdx = 0
  const enrichedItems = items.map((item) => {
    if (!item.aiReason && item.source) {
      const result = enrichments[enrichIdx++]
      if (result.status === 'fulfilled') {
        return {
          ...item,
          aiReason: result.value.reason ?? item.aiReason,
          keywords: result.value.keywords.length
            ? JSON.stringify(result.value.keywords)
            : item.keywords,
        }
      }
    }
    return item
  })

  const cards: WatchlistCardData[] = enrichedItems.map((item) => {
    const md = marketData.get(item.ticker)
    const keywords = item.keywords ? (JSON.parse(item.keywords) as string[]) : []

    return {
      id: item.id,
      ticker: item.ticker,
      name: item.name ?? md?.name ?? null,
      aiReason: item.aiReason ?? null,
      keywords,
      source: item.source ?? null,
      addedAt: item.addedAt,
      price: md?.price ?? null,
      change1d: md?.changePct1d ?? null,
      perf1m: md?.perf1m ?? null,
      perf3m: md?.perf3m ?? null,
      marketCap: md?.marketCap ?? null,
      trailingPE: md?.trailingPE ?? null,
      forwardPE: null,
      epsTrailing: md?.epsTrailing ?? null,
      high52w: md?.high52w ?? null,
      low52w: md?.low52w ?? null,
      currency: md?.currency ?? 'USD',
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Watchlist</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Tickers from your Telegram bot — with live data and AI context.
          </p>
        </div>
        <span className="text-xs text-zinc-400 pb-1">
          {items.length} ticker{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <WatchlistGrid cards={cards} />
    </div>
  )
}
