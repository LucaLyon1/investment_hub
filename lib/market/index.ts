import { YahooFinanceProvider } from './yahoo'
import { FmpProvider } from './fmp'
import type { IMarketProvider } from './provider'

let _provider: IMarketProvider | null = null

export function getMarketProvider(): IMarketProvider {
  if (!_provider) {
    _provider = process.env.FMP_SECRET ? new FmpProvider() : new YahooFinanceProvider()
  }
  return _provider
}

export type { IMarketProvider, QuoteResult, HistoryPoint, NewsItem, PerformanceResult } from './provider'
