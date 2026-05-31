export interface StockTwitsTrending {
  symbol: string
  watchlistCount: number
}

export interface StockTwitsMessage {
  body: string
  sentiment: 'Bullish' | 'Bearish' | null
  createdAt: string
}

function authHeader(): string {
  const user = process.env.STOCKTWITS_USERNAME
  const pass = process.env.STOCKTWITS_PASSWORD
  if (!user || !pass) throw new Error('STOCKTWITS_USERNAME and STOCKTWITS_PASSWORD must be set')
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
}

export async function fetchTrendingSymbols(): Promise<StockTwitsTrending[]> {
  const res = await fetch('https://api.stocktwits.com/api/2/trending/symbols.json', {
    headers: { Authorization: authHeader() },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`StockTwits trending: ${res.status}`)
  const data = await res.json() as { symbols: { symbol: string; watchlist_count: number }[] }
  return data.symbols.map((s) => ({ symbol: s.symbol, watchlistCount: s.watchlist_count }))
}

export async function fetchSymbolStream(
  ticker: string,
  limit = 20
): Promise<StockTwitsMessage[]> {
  const res = await fetch(
    `https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json?limit=${limit}`,
    { headers: { Authorization: authHeader() }, next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`StockTwits ${ticker}: ${res.status}`)
  const data = await res.json() as {
    messages: { body: string; entities: { sentiment?: { basic: string } }; created_at: string }[]
  }
  return data.messages.map((m) => ({
    body: m.body,
    sentiment: (m.entities?.sentiment?.basic ?? null) as StockTwitsMessage['sentiment'],
    createdAt: m.created_at,
  }))
}
