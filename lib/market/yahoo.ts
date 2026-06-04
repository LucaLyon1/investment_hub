import YahooFinance from 'yahoo-finance2'
import type { IMarketProvider, QuoteResult, HistoryPoint, NewsItem, PerformanceResult, FundamentalsResult } from './provider'

const yahooFinance = new YahooFinance({ validation: { logErrors: false } })

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
      trailingPE: quote.trailingPE,
      forwardPE: quote.forwardPE,
      epsTrailing: quote.epsTrailingTwelveMonths,
      priceToBook: quote.priceToBook,
      quoteType: quote.quoteType,
      sector: quote.sector,
      exchange: quote.fullExchangeName ?? quote.exchange,
    }
  }

  async getQuotes(tickers: string[]): Promise<QuoteResult[]> {
    const results = await Promise.allSettled(tickers.map((t) => this.getQuote(t)))
    return results.flatMap((r) => r.status === 'fulfilled' ? [r.value] : [])
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
    const result = await yahooFinance.search(query, { newsCount: maxResults })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((result as any).news ?? []).slice(0, maxResults).map((n: any) => ({
      title: n.title,
      url: n.link,
      publishedAt: new Date(n.providerPublishTime * 1000).toISOString(),
      source: n.publisher,
    }))
  }

  async getFundamentals(ticker: string): Promise<FundamentalsResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await (yahooFinance as any).quoteSummary(ticker, {
      modules: ['financialData', 'defaultKeyStatistics', 'earnings', 'recommendationTrend'],
    }) as any

    const fd = raw?.financialData ?? {}
    const ks = raw?.defaultKeyStatistics ?? {}
    const earnings = raw?.earnings ?? {}
    const recTrend = raw?.recommendationTrend?.trend ?? []

    // Quarterly EPS actuals vs estimates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earningsHistory = (earnings?.earningsChart?.quarterly ?? []).map((q: any) => ({
      date: q.date ?? '',
      actual: q.actual?.raw ?? q.actual ?? null,
      estimate: q.estimate?.raw ?? q.estimate ?? null,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analystTrend = recTrend.slice(0, 2).map((t: any) => ({
      period: t.period ?? '',
      strongBuy: t.strongBuy ?? 0,
      buy: t.buy ?? 0,
      hold: t.hold ?? 0,
      sell: t.sell ?? 0,
      strongSell: t.strongSell ?? 0,
    }))

    const pick = (obj: Record<string, unknown>, key: string): number | undefined => {
      const v = obj[key]
      if (v == null) return undefined
      if (typeof v === 'number') return v
      // yahoo-finance2 sometimes wraps values as { raw, fmt }
      if (typeof v === 'object' && 'raw' in (v as object)) return (v as { raw: number }).raw
      return undefined
    }

    return {
      totalRevenue: pick(fd, 'totalRevenue'),
      revenueGrowth: pick(fd, 'revenueGrowth'),
      grossMargins: pick(fd, 'grossMargins'),
      operatingMargins: pick(fd, 'operatingMargins'),
      profitMargins: pick(fd, 'profitMargins'),
      ebitda: pick(fd, 'ebitda'),
      freeCashflow: pick(fd, 'freeCashflow'),
      operatingCashflow: pick(fd, 'operatingCashflow'),
      totalDebt: pick(fd, 'totalDebt'),
      debtToEquity: pick(fd, 'debtToEquity'),
      returnOnEquity: pick(fd, 'returnOnEquity'),
      returnOnAssets: pick(fd, 'returnOnAssets'),
      targetLow: pick(fd, 'targetLowPrice'),
      targetMean: pick(fd, 'targetMeanPrice'),
      targetHigh: pick(fd, 'targetHighPrice'),
      recommendation: fd.recommendationKey ?? undefined,
      analystCount: pick(fd, 'numberOfAnalystOpinions'),
      enterpriseValue: pick(ks, 'enterpriseValue'),
      pegRatio: pick(ks, 'pegRatio'),
      earningsQuarterlyGrowth: pick(ks, 'earningsQuarterlyGrowth'),
      beta: pick(ks, 'beta'),
      shortPercentOfFloat: pick(ks, 'shortPercentOfFloat'),
      heldPercentInsiders: pick(ks, 'heldPercentInsiders'),
      heldPercentInstitutions: pick(ks, 'heldPercentInstitutions'),
      analystTrend: analystTrend.length ? analystTrend : undefined,
      earningsHistory: earningsHistory.length ? earningsHistory : undefined,
    }
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
