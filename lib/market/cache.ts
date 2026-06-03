import { sql, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { marketDataCache } from '@/lib/db/schema'
import { getMarketProvider } from './index'
import type { MarketDataCacheRow } from '@/lib/db/schema'

const TTL_MS = 24 * 60 * 60 * 1000

export type { MarketDataCacheRow }

/**
 * Returns market data for all requested tickers, using DB cache (24h TTL).
 * Stale or missing entries are fetched from the provider and upserted.
 */
export async function getMarketDataBatch(tickers: string[]): Promise<Map<string, MarketDataCacheRow>> {
  if (tickers.length === 0) return new Map()

  const rows = await db.select().from(marketDataCache).where(inArray(marketDataCache.ticker, tickers))
  const cache = new Map(rows.map((r) => [r.ticker, r]))

  const cutoff = Date.now() - TTL_MS
  const stale = tickers.filter((t) => {
    const row = cache.get(t)
    return !row || row.fetchedAt.getTime() < cutoff
  })

  if (stale.length > 0) {
    const provider = getMarketProvider()

    const [quotesResult, perfResults] = await Promise.all([
      Promise.allSettled([provider.getQuotes(stale)]),
      Promise.allSettled(stale.map((t) => provider.getPerformance(t))),
    ])

    const quotesMap = new Map(
      quotesResult[0].status === 'fulfilled'
        ? quotesResult[0].value.map((q) => [q.ticker, q])
        : []
    )

    const toUpsert = stale
      .map((t, i) => {
        const q = quotesMap.get(t)
        if (!q) return null
        const perf = perfResults[i].status === 'fulfilled' ? perfResults[i].value : {}
        return {
          ticker: t,
          name: q.name ?? null,
          currency: q.currency ?? 'USD',
          exchange: q.exchange ?? null,
          price: q.price ?? null,
          change1d: q.change1d ?? null,
          changePct1d: q.changePct1d ?? null,
          high52w: q.high52w ?? null,
          low52w: q.low52w ?? null,
          marketCap: q.marketCap ?? null,
          trailingPE: q.trailingPE ?? null,
          epsTrailing: q.epsTrailing ?? null,
          perf1m: perf.perf1m ?? null,
          perf3m: perf.perf3m ?? null,
          fetchedAt: new Date(),
        }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)

    if (toUpsert.length > 0) {
      await db
        .insert(marketDataCache)
        .values(toUpsert)
        .onConflictDoUpdate({
          target: marketDataCache.ticker,
          set: {
            name: sql`excluded.name`,
            currency: sql`excluded.currency`,
            exchange: sql`excluded.exchange`,
            price: sql`excluded.price`,
            change1d: sql`excluded.change_1d`,
            changePct1d: sql`excluded.change_pct_1d`,
            high52w: sql`excluded.high_52w`,
            low52w: sql`excluded.low_52w`,
            marketCap: sql`excluded.market_cap`,
            trailingPE: sql`excluded.trailing_pe`,
            epsTrailing: sql`excluded.eps_trailing`,
            perf1m: sql`excluded.perf_1m`,
            perf3m: sql`excluded.perf_3m`,
            fetchedAt: sql`excluded.fetched_at`,
          },
        })

      toUpsert.forEach((v) => cache.set(v.ticker, v))
    }
  }

  return cache
}

export async function deleteMarketDataCache(ticker: string) {
  await db.delete(marketDataCache).where(sql`${marketDataCache.ticker} = ${ticker}`)
}
