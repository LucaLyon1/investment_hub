'use client'

import { useTransition } from 'react'
import { removeFromWatchlist } from '@/app/actions/watchlist'

export interface WatchlistCardData {
  id: string
  ticker: string
  name: string | null
  aiReason: string | null
  source: string | null
  addedAt: Date
  price: number | null
  change1d: number | null
  perf1m: number | null
  perf3m: number | null
  marketCap: number | null
  trailingPE: number | null
  forwardPE: number | null
  epsTrailing: number | null
  high52w: number | null
  low52w: number | null
  currency: string
  quoteType: string | null
  sector: string | null
  exchange: string | null
}

// Sector → Tailwind bg + text classes
const SECTOR_COLORS: Record<string, string> = {
  'Technology':             'bg-blue-100 text-blue-700',
  'Healthcare':             'bg-green-100 text-green-700',
  'Financial Services':     'bg-indigo-100 text-indigo-700',
  'Financials':             'bg-indigo-100 text-indigo-700',
  'Energy':                 'bg-amber-100 text-amber-700',
  'Consumer Cyclical':      'bg-purple-100 text-purple-700',
  'Consumer Defensive':     'bg-teal-100 text-teal-700',
  'Industrials':            'bg-slate-100 text-slate-700',
  'Basic Materials':        'bg-lime-100 text-lime-700',
  'Real Estate':            'bg-rose-100 text-rose-700',
  'Utilities':              'bg-cyan-100 text-cyan-700',
  'Communication Services': 'bg-violet-100 text-violet-700',
}

const QUOTE_TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  ETF:        { label: 'ETF',    cls: 'bg-emerald-100 text-emerald-700' },
  MUTUALFUND: { label: 'Fund',   cls: 'bg-emerald-100 text-emerald-700' },
  EQUITY:     { label: 'Stock',  cls: 'bg-zinc-100 text-zinc-600' },
  INDEX:      { label: 'Index',  cls: 'bg-zinc-100 text-zinc-600' },
  CRYPTOCURRENCY: { label: 'Crypto', cls: 'bg-orange-100 text-orange-700' },
  FUTURE:     { label: 'Future', cls: 'bg-orange-100 text-orange-700' },
}

function Tag({ children, cls }: { children: string; cls: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold leading-tight ${cls}`}>
      {children}
    </span>
  )
}

function Tags({ quoteType, sector }: { quoteType: string | null; sector: string | null }) {
  const tags: { label: string; cls: string }[] = []

  if (quoteType) {
    const qt = QUOTE_TYPE_LABEL[quoteType] ?? { label: quoteType, cls: 'bg-zinc-100 text-zinc-600' }
    // Only show Stock tag if there's no sector (sector already implies stock)
    if (quoteType !== 'EQUITY' || !sector) tags.push(qt)
  }

  if (sector) {
    const cls = SECTOR_COLORS[sector] ?? 'bg-zinc-100 text-zinc-600'
    tags.push({ label: sector, cls })
  }

  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <Tag key={t.label} cls={t.cls}>{t.label}</Tag>
      ))}
    </div>
  )
}

function fmtPct(v: number | null) {
  if (v == null) return '—'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

function fmtPrice(v: number | null, currency: string) {
  if (v == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)
}

function fmtCap(v: number | null) {
  if (v == null) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toFixed(0)}`
}

function PerfBadge({ label, value }: { label: string; value: number | null }) {
  const isPos = value != null && value >= 0
  const isNeg = value != null && value < 0
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide">{label}</span>
      <span
        className={`text-sm font-semibold ${isPos ? 'text-emerald-600' : isNeg ? 'text-red-500' : 'text-zinc-400'}`}
      >
        {fmtPct(value)}
      </span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">{label}</span>
      <span className="text-xs font-medium text-zinc-700">{value}</span>
    </div>
  )
}

function WatchlistCard({ card, onRemove }: { card: WatchlistCardData; onRemove: () => void }) {
  const change1dPos = card.change1d != null && card.change1d >= 0
  const change1dNeg = card.change1d != null && card.change1d < 0

  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-lg font-bold text-zinc-900 leading-tight">{card.ticker}</span>
          {card.name && (
            <span className="text-xs text-zinc-500 truncate max-w-[180px]">{card.name}</span>
          )}
          <Tags quoteType={card.quoteType} sector={card.sector} />
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="text-base font-semibold text-zinc-900">
            {fmtPrice(card.price, card.currency)}
          </span>
          <span
            className={`text-xs font-medium ${change1dPos ? 'text-emerald-600' : change1dNeg ? 'text-red-500' : 'text-zinc-400'}`}
          >
            {fmtPct(card.change1d)} today
          </span>
        </div>
      </div>

      {/* AI reason */}
      {card.aiReason && (
        <p className="text-xs text-zinc-600 leading-relaxed border-l-2 border-zinc-200 pl-3">
          {card.aiReason}
        </p>
      )}

      {/* Performance strip */}
      <div className="flex items-center justify-around bg-zinc-50 rounded-lg py-3 px-2">
        <PerfBadge label="1D" value={card.change1d} />
        <div className="w-px h-8 bg-zinc-200" />
        <PerfBadge label="1M" value={card.perf1m} />
        <div className="w-px h-8 bg-zinc-200" />
        <PerfBadge label="3M" value={card.perf3m} />
      </div>

      {/* Fundamentals */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-3">
        <Stat label="Market Cap" value={fmtCap(card.marketCap)} />
        <Stat label="P/E (TTM)" value={card.trailingPE != null ? card.trailingPE.toFixed(1) : '—'} />
        <Stat label="Fwd P/E" value={card.forwardPE != null ? card.forwardPE.toFixed(1) : '—'} />
        <Stat label="EPS (TTM)" value={card.epsTrailing != null ? `$${card.epsTrailing.toFixed(2)}` : '—'} />
        <Stat label="52W High" value={card.high52w != null ? fmtPrice(card.high52w, card.currency) : '—'} />
        <Stat label="52W Low" value={card.low52w != null ? fmtPrice(card.low52w, card.currency) : '—'} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
        {card.source ? (
          <p className="text-[11px] text-zinc-400 italic truncate max-w-[200px]">
            &ldquo;{card.source}&rdquo;
          </p>
        ) : (
          <span className="text-[11px] text-zinc-300">Added {card.addedAt.toLocaleDateString()}</span>
        )}
        <button
          onClick={onRemove}
          className="text-xs text-zinc-400 hover:text-red-500 transition-colors shrink-0 ml-2"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

export function WatchlistGrid({ cards }: { cards: WatchlistCardData[] }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div
      className={`grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 transition-opacity ${isPending ? 'opacity-60' : ''}`}
    >
      {cards.map((card) => (
        <WatchlistCard
          key={card.id}
          card={card}
          onRemove={() => startTransition(() => removeFromWatchlist(card.id))}
        />
      ))}
    </div>
  )
}
