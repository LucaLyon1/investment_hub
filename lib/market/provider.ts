export interface QuoteResult {
  ticker: string
  name: string
  price: number
  change1d: number
  changePct1d: number
  high52w?: number
  low52w?: number
  marketCap?: number
  currency: string
  // Fundamentals
  trailingPE?: number
  forwardPE?: number
  epsTrailing?: number
  priceToBook?: number
  revenueTrailing?: number
  grossMargins?: number
}

export interface PerformanceResult {
  perf1m?: number
  perf3m?: number
}

export interface HistoryPoint {
  date: string
  close: number
}

export interface NewsItem {
  title: string
  url: string
  publishedAt: string
  source: string
}

export interface IMarketProvider {
  getQuote(ticker: string): Promise<QuoteResult>
  getQuotes(tickers: string[]): Promise<QuoteResult[]>
  getHistory(ticker: string, range: '1mo' | '3mo' | '6mo' | '1y' | '5y'): Promise<HistoryPoint[]>
  getPerformance(ticker: string): Promise<PerformanceResult>
  searchNews(query: string, maxResults?: number): Promise<NewsItem[]>
}
