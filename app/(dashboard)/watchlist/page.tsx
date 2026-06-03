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

  // Generate AI reasons for items that don't have one yet (fire-and-forget per item)
  const aiReasonPromises = items
    .filter((item) => !item.aiReason && item.source)
    .map((item) => generateAiReason(item.id, item.ticker, item.name ?? null, item.source ?? null))

  // Fetch quotes and performance in parallel across all tickers
  const [quotes, performances] = await Promise.all([
    Promise.allSettled(items.map((item) => provider.getQuote(item.ticker))),
    Promise.allSettled(items.map((item) => provider.getPerformance(item.ticker))),
  ])

  // Wait for AI reasons (needed to display them)
  const aiReasons = await Promise.allSettled(aiReasonPromises)

  // Map AI reasons back to items that needed them
  let aiReasonIdx = 0
  const itemsWithUpdatedReasons = items.map((item) => {
    if (!item.aiReason && item.source) {
      const result = aiReasons[aiReasonIdx++]
      return {
        ...item,
        aiReason: result.status === 'fulfilled' ? (result.value ?? item.aiReason) : item.aiReason,
      }
    }
    return item
  })

  const cards: WatchlistCardData[] = itemsWithUpdatedReasons.map((item, i) => {
    const quoteResult = quotes[i]
    const perfResult = performances[i]
    const quote = quoteResult.status === 'fulfilled' ? quoteResult.value : null
    const perf = perfResult.status === 'fulfilled' ? perfResult.value : null

    return {
      id: item.id,
      ticker: item.ticker,
      name: item.name ?? quote?.name ?? null,
      aiReason: item.aiReason ?? null,
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
