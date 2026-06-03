export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { watchlist } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { getMarketProvider } from '@/lib/market'
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

  const provider = getMarketProvider()

  const needsEnrichment = items.filter((item) => !item.aiReason && item.source)
  const enrichmentPromises = needsEnrichment.map((item) =>
    generateAiReason(item.id, item.ticker, item.name ?? null, item.source ?? null)
  )

  const [quotes, performances, enrichments] = await Promise.all([
    Promise.allSettled(items.map((item) => provider.getQuote(item.ticker))),
    Promise.allSettled(items.map((item) => provider.getPerformance(item.ticker))),
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

  const cards: WatchlistCardData[] = enrichedItems.map((item, i) => {
    const quote = quotes[i].status === 'fulfilled' ? quotes[i].value : null
    const perf = performances[i].status === 'fulfilled' ? performances[i].value : null
    const keywords = item.keywords ? (JSON.parse(item.keywords) as string[]) : []

    return {
      id: item.id,
      ticker: item.ticker,
      name: item.name ?? quote?.name ?? null,
      aiReason: item.aiReason ?? null,
      keywords,
      source: item.source ?? null,
      addedAt: item.addedAt,
      price: quote?.price ?? null,
      change1d: quote?.changePct1d ?? null,
      perf1m: perf?.perf1m ?? null,
      perf3m: perf?.perf3m ?? null,
      marketCap: quote?.marketCap ?? null,
      trailingPE: quote?.trailingPE ?? null,
      forwardPE: quote?.forwardPE ?? null,
      epsTrailing: quote?.epsTrailing ?? null,
      high52w: quote?.high52w ?? null,
      low52w: quote?.low52w ?? null,
      currency: quote?.currency ?? 'USD',
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
