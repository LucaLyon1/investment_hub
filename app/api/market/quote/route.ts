import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { priceCache } from '@/lib/db/schema'
import { getMarketProvider } from '@/lib/market'

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')?.toUpperCase()
  if (!ticker) return Response.json({ error: 'ticker required' }, { status: 400 })

  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000)
  const row = await db.query.priceCache.findFirst({
    where: (t, { eq }) => eq(t.ticker, ticker),
  })

  if (row && row.fetchedAt > staleThreshold) {
    return Response.json(row)
  }

  try {
    const provider = getMarketProvider()
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

    return Response.json({ ...quote, fetchedAt: new Date() })
  } catch {
    if (row) return Response.json(row)
    return Response.json({ error: 'Failed to fetch quote' }, { status: 502 })
  }
}
