import type { IMarketProvider, QuoteResult, HistoryPoint, NewsItem, PerformanceResult } from './provider'

const BASE = 'https://financialmodelingprep.com/api'

function apiKey(): string {
  const key = process.env.FMP_SECRET
  if (!key) throw new Error('FMP_SECRET not set')
  return key
}

async function fmpFetch<T>(path: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE}${path}${sep}apikey=${apiKey()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`FMP ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

interface FmpQuote {
  symbol: string
  name: string
  price: number
  changesPercentage: number
  change: number
  yearHigh: number
  yearLow: number
  marketCap: number
  eps: number
  pe: number
  exchange: string
  currency?: string
}

interface FmpHistoricalResponse {
  historical?: Array<{ date: string; close: number }>
}

interface FmpNewsItem {
  title: string
  url: string
  publishedDate: string
  site: string
}

function mapQuote(ticker: string, q: FmpQuote): QuoteResult {
  return {
    ticker,
    name: q.name ?? ticker,
    price: q.price ?? 0,
    change1d: q.change ?? 0,
    changePct1d: q.changesPercentage ?? 0,
    high52w: q.yearHigh ?? undefined,
    low52w: q.yearLow ?? undefined,
    marketCap: q.marketCap ?? undefined,
    currency: q.currency ?? 'USD',
    trailingPE: q.pe > 0 ? q.pe : undefined,
    epsTrailing: q.eps ?? undefined,
    exchange: q.exchange,
  }
}

export class FmpProvider implements IMarketProvider {
  async getQuote(ticker: string): Promise<QuoteResult> {
    const data = await fmpFetch<FmpQuote[]>(`/v3/quote/${ticker}`)
    const q = data[0]
    if (!q) throw new Error(`No FMP data for ${ticker}`)
    return mapQuote(ticker, q)
  }

  async getQuotes(tickers: string[]): Promise<QuoteResult[]> {
    if (tickers.length === 0) return []
    // FMP supports comma-separated batch: /v3/quote/AAPL,GOOG,...
    const data = await fmpFetch<FmpQuote[]>(`/v3/quote/${tickers.join(',')}`)
    const bySymbol = new Map(data.map((q) => [q.symbol, q]))
    // Skip tickers not returned by FMP rather than throwing and failing the whole batch
    return tickers.flatMap((t) => {
      const q = bySymbol.get(t)
      return q ? [mapQuote(t, q)] : []
    })
  }

  async getHistory(ticker: string, range: '1mo' | '3mo' | '6mo' | '1y' | '5y'): Promise<HistoryPoint[]> {
    const from = rangeToDate(range).toISOString().split('T')[0]
    const to = new Date().toISOString().split('T')[0]
    const data = await fmpFetch<FmpHistoricalResponse>(
      `/v3/historical-price-full/${ticker}?from=${from}&to=${to}&serietype=line`
    )
    // FMP returns newest-first — reverse to get chronological order
    return (data.historical ?? []).reverse().map((h) => ({ date: h.date, close: h.close }))
  }

  async getPerformance(ticker: string): Promise<PerformanceResult> {
    try {
      const history = await this.getHistory(ticker, '3mo')
      if (history.length < 2) return {}
      const latest = history[history.length - 1].close
      const ago1m = history[Math.max(0, history.length - 22)]?.close
      const ago3m = history[0].close
      return {
        perf1m: ago1m ? ((latest - ago1m) / ago1m) * 100 : undefined,
        perf3m: ago3m ? ((latest - ago3m) / ago3m) * 100 : undefined,
      }
    } catch {
      return {}
    }
  }

  async searchNews(query: string, maxResults = 5): Promise<NewsItem[]> {
    const items = await fmpFetch<FmpNewsItem[]>(
      `/v3/stock_news?tickers=${encodeURIComponent(query)}&limit=${maxResults}`
    )
    return (items ?? []).slice(0, maxResults).map((n) => ({
      title: n.title,
      url: n.url,
      publishedAt: n.publishedDate,
      source: n.site,
    }))
  }
}

function rangeToDate(range: string): Date {
  const now = new Date()
  const days: Record<string, number> = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '5y': 1825 }
  now.setDate(now.getDate() - (days[range] ?? 365))
  return now
}
