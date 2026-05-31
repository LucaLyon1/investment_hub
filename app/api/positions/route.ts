import { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { positions, priceCache } from '@/lib/db/schema'
import { updateTag } from 'next/cache'
import { getMarketProvider } from '@/lib/market'

export async function GET() {
  const allPositions = await db.select().from(positions)
  const tickers = [...new Set(allPositions.map((p) => p.ticker))]

  const cachedPrices = tickers.length
    ? await db.select().from(priceCache).all()
    : []

  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000)
  const staleTickers = tickers.filter((ticker) => {
    const cached = cachedPrices.find((c) => c.ticker === ticker)
    return !cached || cached.fetchedAt < staleThreshold
  })

  if (staleTickers.length > 0) {
    const provider = getMarketProvider()
    await Promise.allSettled(
      staleTickers.map(async (ticker) => {
        try {
          const quote = await provider.getQuote(ticker)
          await db
            .insert(priceCache)
            .values({
              ticker,
              price: quote.price,
              change1d: quote.change1d,
              changePct1d: quote.changePct1d,
              fetchedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: priceCache.ticker,
              set: {
                price: quote.price,
                change1d: quote.change1d,
                changePct1d: quote.changePct1d,
                fetchedAt: new Date(),
              },
            })
        } catch {
          // silently ignore stale fetch errors
        }
      })
    )
  }

  const freshPrices = await db.select().from(priceCache).all()
  const priceMap = new Map(freshPrices.map((p) => [p.ticker, p]))

  const result = allPositions.map((pos) => {
    const cached = priceMap.get(pos.ticker)
    const currentPrice = cached?.price ?? pos.avgBuyPrice
    const currentValue = currentPrice * pos.quantity
    const costBasis = pos.avgBuyPrice * pos.quantity
    const pnl = currentValue - costBasis
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0
    return {
      ...pos,
      currentPrice,
      currentValue,
      costBasis,
      pnl,
      pnlPct,
      change1d: cached?.change1d ?? 0,
      changePct1d: cached?.changePct1d ?? 0,
    }
  })

  return Response.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const now = new Date()

  const position = await db
    .insert(positions)
    .values({
      id: nanoid(),
      ticker: body.ticker.toUpperCase(),
      name: body.name,
      assetClass: body.assetClass,
      quantity: body.quantity,
      avgBuyPrice: body.avgBuyPrice,
      currency: body.currency ?? 'USD',
      notes: body.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  updateTag('positions')
  return Response.json(position[0], { status: 201 })
}
