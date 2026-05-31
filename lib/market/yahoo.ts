import YahooFinance from 'yahoo-finance2'
import type { IMarketProvider, QuoteResult, HistoryPoint, NewsItem } from './provider'

const yahooFinance = new YahooFinance()

export class YahooFinanceProvider implements IMarketProvider {
  async getQuote(ticker: string): Promise<QuoteResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = (await yahooFinance.quote(ticker)) as any
    return {
      ticker,
      name: quote.longName ?? quote.shortName ?? ticker,
      price: quote.regularMarketPrice ?? 0,
      change1d: quote.regularMarketChange ?? 0,
      changePct1d: quote.regularMarketChangePercent ?? 0,
      high52w: quote.fiftyTwoWeekHigh,
      low52w: quote.fiftyTwoWeekLow,
      marketCap: quote.marketCap,
      currency: quote.currency ?? 'USD',
    }
  }

  async getQuotes(tickers: string[]): Promise<QuoteResult[]> {
    return Promise.all(tickers.map((t) => this.getQuote(t)))
  }

  async getHistory(
    ticker: string,
    range: '1mo' | '3mo' | '6mo' | '1y' | '5y'
  ): Promise<HistoryPoint[]> {
    const result = await yahooFinance.chart(ticker, {
      period1: rangeToDate(range),
      interval: range === '1mo' ? '1d' : range === '3mo' ? '1d' : '1wk',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((result as any).quotes ?? [])
      .filter((q: { close: number | null }) => q.close != null)
      .map((q: { date: Date; close: number }) => ({
        date: new Date(q.date).toISOString().split('T')[0],
        close: q.close,
      }))
  }

  async searchNews(query: string, maxResults = 5): Promise<NewsItem[]> {
    const result = await yahooFinance.search(query, { newsCount: maxResults })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((result as any).news ?? []).slice(0, maxResults).map((n: any) => ({
      title: n.title,
      url: n.link,
      publishedAt: new Date(n.providerPublishTime * 1000).toISOString(),
      source: n.publisher,
    }))
  }
}

function rangeToDate(range: string): Date {
  const now = new Date()
  const map: Record<string, number> = {
    '1mo': 30,
    '3mo': 90,
    '6mo': 180,
    '1y': 365,
    '5y': 1825,
  }
  now.setDate(now.getDate() - (map[range] ?? 365))
  return now
}
