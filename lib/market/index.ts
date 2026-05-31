import { YahooFinanceProvider } from './yahoo'
import type { IMarketProvider } from './provider'

let _provider: IMarketProvider | null = null

export function getMarketProvider(): IMarketProvider {
  if (!_provider) {
    _provider = new YahooFinanceProvider()
  }
  return _provider
}

export type { IMarketProvider, QuoteResult, HistoryPoint, NewsItem } from './provider'
