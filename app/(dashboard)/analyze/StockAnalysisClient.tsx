'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine,
  Legend,
} from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { AddPositionForm } from '@/components/portfolio/AddPositionForm'
import { checkWatchlist, addToWatchlist, removeFromWatchlist } from '@/app/actions/watchlist'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Overview {
  price: number
  change1d: number
  changePct1d: number
  marketCap?: number
  peRatioTrailing?: number
  peRatioForward?: number
  priceToBook?: number
  eps?: number
  high52w?: number
  low52w?: number
  sector?: string
  exchange?: string
  currency: string
}

interface Performance {
  perf1m?: number
  perf3m?: number
  perf6m?: number
  perf1y?: number
}

interface HistoryPoint { date: string; close: number }

interface SentimentData { score: number; label: string; summary: string }

interface NewsItem { title: string; source: string; publishedAt: string; url: string }

interface Technicals {
  trend: 'uptrend' | 'downtrend' | 'sideways'
  signal: 'buy' | 'hold' | 'sell'
  note: string
}

interface Verdict {
  signal: 'buy' | 'hold' | 'sell'
  confidence: 'high' | 'medium' | 'low'
  summary: string
  targetPrice?: number
  timeHorizon?: string
  keyRisk?: string
}

interface Fundamentals {
  totalRevenue?: number
  revenueGrowth?: number
  grossMargins?: number
  operatingMargins?: number
  profitMargins?: number
  ebitda?: number
  freeCashflow?: number
  operatingCashflow?: number
  totalDebt?: number
  debtToEquity?: number
  returnOnEquity?: number
  returnOnAssets?: number
  enterpriseValue?: number
  pegRatio?: number
  earningsQuarterlyGrowth?: number
  beta?: number
  shortPercentOfFloat?: number
  heldPercentInsiders?: number
  heldPercentInstitutions?: number
}

interface AnalystTrend {
  period: string
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
}

interface AnalystConsensus {
  targetLow?: number
  targetMean?: number
  targetHigh?: number
  recommendation?: string
  analystCount?: number
  trend?: AnalystTrend[]
}

interface EarningsQuarter { date: string; actual: number | null; estimate: number | null; surprise?: number }

interface StockAnalysis {
  ticker: string
  name: string
  overview: Overview
  performance: Performance
  priceHistory: HistoryPoint[]
  fundamentals?: Fundamentals
  analystConsensus?: AnalystConsensus
  earningsHistory?: EarningsQuarter[]
  bullCase: string[]
  bearCase: string[]
  sentiment: SentimentData
  news: NewsItem[]
  technicals: Technicals
  verdict: Verdict
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtPct(n: number | undefined): string {
  if (n == null || isNaN(n)) return '—'
  return `${n >= 0 ? '+' : ''}${fmt(n)}%`
}

function fmtShort(n: number | undefined): string {
  if (n == null) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function signalColor(s: string): string {
  if (s === 'buy' || s === 'strongbuy') return 'bg-emerald-100 text-emerald-700'
  if (s === 'sell' || s === 'strongsell') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}

function signalBorder(s: string): string {
  if (s === 'buy') return 'border-emerald-400'
  if (s === 'sell') return 'border-red-400'
  return 'border-amber-400'
}

function perfColor(n: number | undefined): string {
  if (n == null) return '#94a3b8'
  return n >= 0 ? '#10b981' : '#ef4444'
}

function trendIcon(t: string): string {
  if (t === 'uptrend') return '↑'
  if (t === 'downtrend') return '↓'
  return '→'
}

function pctBar(value: number | undefined): number {
  if (value == null) return 0
  return Math.min(100, Math.max(0, value * 100))
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 px-4 py-3">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-zinc-900">{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function RangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100))
  return (
    <div className="space-y-1">
      <div className="relative h-2 rounded-full overflow-visible">
        <div className="h-full w-full bg-gradient-to-r from-red-200 via-amber-200 to-emerald-200 rounded-full" />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-zinc-800 border-2 border-white shadow" style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }} />
      </div>
      <div className="flex justify-between text-xs text-zinc-500 mt-2">
        <span>${fmt(low)}</span>
        <span className="text-zinc-400">52-week range</span>
        <span>${fmt(high)}</span>
      </div>
    </div>
  )
}

function SentimentBar({ score, label, summary }: SentimentData) {
  const color = score >= 60 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        <span className="text-lg font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="relative h-3 bg-zinc-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between text-xs text-zinc-400">
        <span>Bearish</span><span>Neutral</span><span>Bullish</span>
      </div>
      <p className="text-sm text-zinc-600 leading-relaxed">{summary}</p>
    </div>
  )
}

function MarginsBar({ label, value }: { label: string; value: number | undefined }) {
  const pct = pctBar(value)
  const color = pct >= 20 ? '#10b981' : pct >= 10 ? '#f59e0b' : '#ef4444'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-600">{label}</span>
        <span className="font-medium text-zinc-800">{value != null ? `${(value * 100).toFixed(1)}%` : '—'}</span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function AnalystRatingBar({ trend }: { trend: AnalystTrend }) {
  const total = trend.strongBuy + trend.buy + trend.hold + trend.sell + trend.strongSell
  if (total === 0) return null
  const pct = (n: number) => (n / total) * 100
  const segments = [
    { label: 'Strong Buy', value: trend.strongBuy, color: '#059669' },
    { label: 'Buy', value: trend.buy, color: '#10b981' },
    { label: 'Hold', value: trend.hold, color: '#f59e0b' },
    { label: 'Sell', value: trend.sell, color: '#f97316' },
    { label: 'Strong Sell', value: trend.strongSell, color: '#ef4444' },
  ].filter((s) => s.value > 0)

  return (
    <div className="space-y-2">
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
        {segments.map((s) => (
          <div
            key={s.label}
            className="h-full"
            style={{ width: `${pct(s.value)}%`, backgroundColor: s.color }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((s) => (
          <span key={s.label} className="text-xs text-zinc-500 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} ({s.value})
          </span>
        ))}
      </div>
    </div>
  )
}

function PriceTargetRange({ low, mean, high, current }: { low: number; mean: number; high: number; current: number }) {
  const min = Math.min(low, current) * 0.97
  const max = Math.max(high, current) * 1.03
  const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`
  return (
    <div className="mt-4 space-y-3">
      <div className="relative h-2 bg-zinc-100 rounded-full">
        <div
          className="absolute h-full bg-indigo-200 rounded-full"
          style={{ left: pos(low), width: `${((high - low) / (max - min)) * 100}%` }}
        />
        <div className="absolute w-0.5 h-4 bg-indigo-500 -top-1 rounded" style={{ left: pos(mean), transform: 'translateX(-50%)' }} />
        <div className="absolute w-3 h-3 bg-zinc-800 border-2 border-white rounded-full -top-0.5 shadow" style={{ left: pos(current), transform: 'translateX(-50%)' }} />
      </div>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>Low ${fmt(low)}</span>
        <span className="text-indigo-600 font-medium">Mean ${fmt(mean)}</span>
        <span>High ${fmt(high)}</span>
      </div>
      <p className="text-xs text-zinc-400">Current ${fmt(current)} · black dot</p>
    </div>
  )
}

function PriceChart({ data, currency }: { data: HistoryPoint[]; currency: string }) {
  if (!data.length) return null
  const first = data[0].close
  const last = data[data.length - 1].close
  const color = last >= first ? '#10b981' : '#ef4444'
  const sampled = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 60)) === 0)
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={sampled} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          tickFormatter={(d) => { const dt = new Date(d); return `${dt.toLocaleString('en-US', { month: 'short' })} ${dt.getDate()}` }}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `${currency === 'USD' ? '$' : ''}${v.toFixed(0)}`} width={55} domain={['auto', 'auto']}
        />
        <Tooltip formatter={(v) => [`${currency === 'USD' ? '$' : ''}${fmt(Number(v))}`, 'Price']}
          labelStyle={{ fontSize: 11, color: '#64748b' }} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill="url(#priceGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function PerformanceChart({ performance }: { performance: Performance }) {
  const data = [
    { label: '1M', value: performance.perf1m },
    { label: '3M', value: performance.perf3m },
    { label: '6M', value: performance.perf6m },
    { label: '1Y', value: performance.perf1y },
  ].filter((d) => d.value != null) as { label: string; value: number }[]
  if (!data.length) return null
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`} width={45}
        />
        <Tooltip formatter={(v) => { const n = Number(v); return [`${n >= 0 ? '+' : ''}${fmt(n)}%`, 'Return'] }}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <ReferenceLine y={0} stroke="#cbd5e1" />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={perfColor(entry.value)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function EpsChart({ history }: { history: EarningsQuarter[] }) {
  if (!history.length) return null
  const data = history.map((q) => ({
    date: q.date,
    actual: q.actual,
    estimate: q.estimate,
    beat: q.actual != null && q.estimate != null ? q.actual >= q.estimate : null,
  }))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `$${v.toFixed(2)}`} width={50}
        />
        <Tooltip
          formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name === 'actual' ? 'Actual EPS' : 'Estimate']}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Legend formatter={(v) => v === 'actual' ? 'Actual EPS' : 'Estimate'} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="estimate" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
        <Bar dataKey="actual" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.beat === null ? '#6366f1' : entry.beat ? '#10b981' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function StockAnalysisClient() {
  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [watchlistId, setWatchlistId] = useState<string | null>(null)
  const [showPortfolioModal, setShowPortfolioModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Check watchlist status whenever analysis loads
  useEffect(() => {
    if (!analysis) { setWatchlistId(null); return }
    checkWatchlist(analysis.ticker).then((s) => setWatchlistId(s.id ?? null))
  }, [analysis])

  function handleToggleWatchlist() {
    if (!analysis) return
    startTransition(async () => {
      if (watchlistId) {
        await removeFromWatchlist(watchlistId)
        setWatchlistId(null)
      } else {
        const { id } = await addToWatchlist(analysis.ticker, analysis.name)
        setWatchlistId(id)
      }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ticker.trim()) return
    setLoading(true)
    setError(null)
    setAnalysis(null)
    try {
      const res = await fetch('/api/ai/stock-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.trim() }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Unknown error')
      else setAnalysis(data as StockAnalysis)
    } catch {
      setError('Failed to fetch analysis. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const ov = analysis?.overview
  const fund = analysis?.fundamentals
  const analyst = analysis?.analystConsensus

  return (
    <div className="space-y-8">
      {/* Search */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Enter ticker symbol (e.g. AAPL, NVDA, MSFT)"
          className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          disabled={loading}
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={loading || !ticker.trim()}
          className="px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </form>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-zinc-100 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-zinc-100 rounded-xl" />)}
          </div>
          <div className="h-56 bg-zinc-100 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48 bg-zinc-100 rounded-xl" />
            <div className="h-48 bg-zinc-100 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-40 bg-zinc-100 rounded-xl" />
            <div className="h-40 bg-zinc-100 rounded-xl" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">{error}</div>
      )}

      {/* Results */}
      {analysis && ov && (
        <div className="space-y-6">

          {/* ── Header ── */}
          <div className={`bg-white rounded-xl border-l-4 ${signalBorder(analysis.verdict.signal)} border border-zinc-200 px-6 py-5`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-zinc-900">{analysis.ticker}</h2>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${signalColor(analysis.verdict.signal)}`}>
                    {analysis.verdict.signal}
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 uppercase tracking-wide">
                    {analysis.verdict.confidence} confidence
                  </span>
                </div>
                <p className="text-zinc-500 text-sm mt-1">{analysis.name} · {ov.exchange} · {ov.sector}</p>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={handleToggleWatchlist}
                    disabled={isPending}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                      watchlistId
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700'
                    }`}
                  >
                    {watchlistId ? '★ In Watchlist' : '☆ Add to Watchlist'}
                  </button>

                  <button
                    onClick={() => setShowPortfolioModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white border-zinc-200 text-zinc-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                  >
                    + Add to Portfolio
                  </button>

                  <a
                    href={`https://www.tradingview.com/chart/?symbol=${analysis.ticker}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    ↗ TradingView
                  </a>
                </div>
              </div>

              <div className="text-right">
                <p className="text-3xl font-bold text-zinc-900">{ov.currency === 'USD' ? '$' : ''}{fmt(ov.price)}</p>
                <p className={`text-sm font-medium mt-0.5 ${(ov.changePct1d ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(ov.change1d ?? 0) >= 0 ? '+' : ''}{fmt(ov.change1d)} ({fmtPct(ov.changePct1d)}) today
                </p>
              </div>
            </div>
          </div>

          {/* ── Add to Portfolio modal ── */}
          {showPortfolioModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowPortfolioModal(false)} />
              <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-zinc-900">Add to Portfolio</h3>
                  <button onClick={() => setShowPortfolioModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">×</button>
                </div>
                <AddPositionForm
                  defaultValues={{
                    ticker: analysis.ticker,
                    name: analysis.name,
                    assetClass: 'stock',
                    currency: ov.currency,
                    avgBuyPrice: ov.price,
                  }}
                  onSuccess={() => setShowPortfolioModal(false)}
                />
              </div>
            </div>
          )}

          {/* ── Valuation stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard label="Market Cap" value={fmtShort(ov.marketCap)} />
            <StatCard label="Enterprise Value" value={fmtShort(fund?.enterpriseValue)} />
            <StatCard label="P/E (Trailing)" value={ov.peRatioTrailing != null ? fmt(ov.peRatioTrailing, 1) : '—'} />
            <StatCard label="P/E (Forward)" value={ov.peRatioForward != null ? fmt(ov.peRatioForward, 1) : '—'} />
            <StatCard label="PEG Ratio" value={fund?.pegRatio != null ? fmt(fund.pegRatio, 2) : '—'} />
            <StatCard label="Price / Book" value={ov.priceToBook != null ? fmt(ov.priceToBook, 1) : '—'} />
            <StatCard label="EPS (TTM)" value={ov.eps != null ? `$${fmt(ov.eps)}` : '—'} />
            <StatCard
              label="EPS Growth (QoQ)"
              value={fund?.earningsQuarterlyGrowth != null ? fmtPct(fund.earningsQuarterlyGrowth * 100) : '—'}
            />
          </div>

          {/* ── 52w range ── */}
          {ov.high52w != null && ov.low52w != null && (
            <Card><CardContent><RangeBar low={ov.low52w} high={ov.high52w} current={ov.price} /></CardContent></Card>
          )}

          {/* ── Key financials ── */}
          {fund && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Key Financials</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <StatCard
                  label="Revenue (TTM)"
                  value={fmtShort(fund.totalRevenue)}
                  sub={fund.revenueGrowth != null ? `${fmtPct(fund.revenueGrowth * 100)} YoY` : undefined}
                />
                <StatCard label="EBITDA" value={fmtShort(fund.ebitda)} />
                <StatCard label="Free Cash Flow" value={fmtShort(fund.freeCashflow)} />
                <StatCard label="Operating Cash Flow" value={fmtShort(fund.operatingCashflow)} />
                <StatCard label="Total Debt" value={fmtShort(fund.totalDebt)} />
                <StatCard label="Debt / Equity" value={fund.debtToEquity != null ? fmt(fund.debtToEquity, 1) : '—'} />
                <StatCard label="Return on Equity" value={fund.returnOnEquity != null ? fmtPct(fund.returnOnEquity * 100) : '—'} />
                <StatCard label="Return on Assets" value={fund.returnOnAssets != null ? fmtPct(fund.returnOnAssets * 100) : '—'} />
              </div>
            </div>
          )}

          {/* ── Price chart ── */}
          {analysis.priceHistory.length > 0 && (
            <Card>
              <CardHeader><h3 className="text-sm font-semibold text-zinc-800">Price History (3 months)</h3></CardHeader>
              <CardContent><PriceChart data={analysis.priceHistory} currency={ov.currency} /></CardContent>
            </Card>
          )}

          {/* ── Performance + Sentiment ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><h3 className="text-sm font-semibold text-zinc-800">Performance</h3></CardHeader>
              <CardContent>
                <PerformanceChart performance={analysis.performance} />
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[
                    { label: '1M', val: analysis.performance.perf1m },
                    { label: '3M', val: analysis.performance.perf3m },
                    { label: '6M', val: analysis.performance.perf6m },
                    { label: '1Y', val: analysis.performance.perf1y },
                  ].map(({ label, val }) => (
                    <div key={label} className="text-center">
                      <p className="text-xs text-zinc-400">{label}</p>
                      <p className={`text-sm font-semibold ${(val ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(val)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-sm font-semibold text-zinc-800">Retail Sentiment</h3></CardHeader>
              <CardContent><SentimentBar {...analysis.sentiment} /></CardContent>
            </Card>
          </div>

          {/* ── Analyst Consensus ── */}
          {analyst && (analyst.targetMean != null || analyst.trend?.length) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-800">Analyst Consensus</h3>
                  <div className="flex items-center gap-2">
                    {analyst.recommendation && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${signalColor(analyst.recommendation)}`}>
                        {analyst.recommendation.replace('strong', 'Strong ')}
                      </span>
                    )}
                    {analyst.analystCount != null && (
                      <span className="text-xs text-zinc-400">{analyst.analystCount} analysts</span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {analyst.trend?.[0] && <AnalystRatingBar trend={analyst.trend[0]} />}
                {analyst.targetLow != null && analyst.targetMean != null && analyst.targetHigh != null && (
                  <PriceTargetRange
                    low={analyst.targetLow}
                    mean={analyst.targetMean}
                    high={analyst.targetHigh}
                    current={ov.price}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* ── EPS History ── */}
          {analysis.earningsHistory && analysis.earningsHistory.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-800">EPS — Actual vs Estimate</h3>
                  <span className="text-xs text-zinc-400">Green = beat · Red = miss</span>
                </div>
              </CardHeader>
              <CardContent>
                <EpsChart history={analysis.earningsHistory} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {analysis.earningsHistory.map((q, i) => (
                    <div key={i} className="bg-zinc-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-zinc-400 mb-1">{q.date}</p>
                      <p className="text-sm font-semibold text-zinc-900">${q.actual?.toFixed(2) ?? '—'}</p>
                      <p className="text-xs text-zinc-500">est. ${q.estimate?.toFixed(2) ?? '—'}</p>
                      {q.surprise != null && (
                        <p className={`text-xs font-medium mt-0.5 ${q.surprise >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {q.surprise >= 0 ? '+' : ''}{q.surprise.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Margins + Ownership ── */}
          {fund && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-zinc-800">Profit Margins</h3></CardHeader>
                <CardContent className="space-y-4">
                  <MarginsBar label="Gross Margin" value={fund.grossMargins} />
                  <MarginsBar label="Operating Margin" value={fund.operatingMargins} />
                  <MarginsBar label="Net Profit Margin" value={fund.profitMargins} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-zinc-800">Ownership & Risk</h3></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Beta" value={fund.beta != null ? fmt(fund.beta, 2) : '—'} />
                    <StatCard
                      label="Short Float"
                      value={fund.shortPercentOfFloat != null ? `${(fund.shortPercentOfFloat * 100).toFixed(2)}%` : '—'}
                    />
                    <StatCard
                      label="Insider Ownership"
                      value={fund.heldPercentInsiders != null ? `${(fund.heldPercentInsiders * 100).toFixed(2)}%` : '—'}
                    />
                    <StatCard
                      label="Institutional"
                      value={fund.heldPercentInstitutions != null ? `${(fund.heldPercentInstitutions * 100).toFixed(1)}%` : '—'}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Bull / Bear ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><h3 className="text-sm font-semibold text-emerald-700">Bull Case</h3></CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {analysis.bullCase.map((point, i) => (
                    <li key={i} className="flex gap-3 text-sm text-zinc-700 leading-relaxed">
                      <span className="mt-0.5 text-emerald-500 shrink-0">▲</span>{point}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-sm font-semibold text-red-700">Bear Case</h3></CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {analysis.bearCase.map((point, i) => (
                    <li key={i} className="flex gap-3 text-sm text-zinc-700 leading-relaxed">
                      <span className="mt-0.5 text-red-400 shrink-0">▼</span>{point}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* ── Technicals + Verdict ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-800">Technicals</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${signalColor(analysis.technicals.signal)}`}>
                    {analysis.technicals.signal.toUpperCase()}
                  </span>
                  <span className="text-xs text-zinc-500">{trendIcon(analysis.technicals.trend)} {analysis.technicals.trend}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-700 leading-relaxed">{analysis.technicals.note}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-800">Verdict</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${signalColor(analysis.verdict.signal)}`}>
                    {analysis.verdict.signal.toUpperCase()}
                  </span>
                  {analysis.verdict.timeHorizon && (
                    <span className="text-xs text-zinc-400">{analysis.verdict.timeHorizon}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-zinc-700 leading-relaxed">{analysis.verdict.summary}</p>
                {analysis.verdict.keyRisk && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-medium text-amber-700 mb-1">Key Risk</p>
                    <p className="text-xs text-amber-800 leading-relaxed">{analysis.verdict.keyRisk}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── News ── */}
          {analysis.news.length > 0 && (
            <Card>
              <CardHeader><h3 className="text-sm font-semibold text-zinc-800">Recent News</h3></CardHeader>
              <CardContent className="divide-y divide-zinc-100">
                {analysis.news.map((item, i) => (
                  <div key={i} className="py-3 first:pt-0 last:pb-0">
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium text-zinc-800 hover:text-indigo-600 transition-colors leading-snug block">
                      {item.title}
                    </a>
                    <p className="text-xs text-zinc-400 mt-1">
                      {item.source} · {new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        </div>
      )}
    </div>
  )
}
