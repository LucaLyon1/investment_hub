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
  // Classification
  quoteType?: string
  sector?: string
  exchange?: string
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

export interface EarningsQuarter {
  date: string
  actual: number | null
  estimate: number | null
}

export interface AnalystTrend {
  period: string
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
}

export interface FundamentalsResult {
  // Income & cash flow
  totalRevenue?: number
  revenueGrowth?: number
  grossMargins?: number
  operatingMargins?: number
  profitMargins?: number
  ebitda?: number
  freeCashflow?: number
  operatingCashflow?: number
  // Balance sheet
  totalDebt?: number
  debtToEquity?: number
  // Returns
  returnOnEquity?: number
  returnOnAssets?: number
  // Valuation extras
  enterpriseValue?: number
  pegRatio?: number
  earningsQuarterlyGrowth?: number
  // Risk / ownership
  beta?: number
  shortPercentOfFloat?: number
  heldPercentInsiders?: number
  heldPercentInstitutions?: number
  // Analyst targets
  targetLow?: number
  targetMean?: number
  targetHigh?: number
  recommendation?: string
  analystCount?: number
  analystTrend?: AnalystTrend[]
  // Earnings history
  earningsHistory?: EarningsQuarter[]
}

export interface IMarketProvider {
  getQuote(ticker: string): Promise<QuoteResult>
  getQuotes(tickers: string[]): Promise<QuoteResult[]>
  getHistory(ticker: string, range: '1mo' | '3mo' | '6mo' | '1y' | '5y'): Promise<HistoryPoint[]>
  getPerformance(ticker: string): Promise<PerformanceResult>
  searchNews(query: string, maxResults?: number): Promise<NewsItem[]>
  getFundamentals(ticker: string): Promise<FundamentalsResult>
}
