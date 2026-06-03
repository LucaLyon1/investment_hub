'use client'

import { useTransition, useState } from 'react'
import { removeFromWatchlist } from '@/app/actions/watchlist'
import { AddPositionForm } from '@/components/portfolio/AddPositionForm'

export interface WatchlistCardData {
  id: string
  ticker: string
  name: string | null
  aiReason: string | null
  keywords: string[]
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
}

// Deterministic color palette — cycles based on keyword text hash
const PILL_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-purple-100 text-purple-700',
]

function pillColor(keyword: string): string {
  let hash = 0
  for (let i = 0; i < keyword.length; i++) hash = (hash * 31 + keyword.charCodeAt(i)) >>> 0
  return PILL_COLORS[hash % PILL_COLORS.length]
}

function KeywordPills({ keywords }: { keywords: string[] }) {
  if (!keywords.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((kw) => (
        <span
          key={kw}
          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold leading-tight ${pillColor(kw)}`}
        >
          {kw}
        </span>
      ))}
    </div>
  )
}

function fmtPct(v: number | null) {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

function fmtPrice(v: number | null, currency: string) {
  if (v == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

function fmtCap(v: number | null) {
  if (v == null) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toFixed(0)}`
}

function PerfBadge({ label, value }: { label: string; value: number | null }) {
  const color = value == null ? 'text-zinc-400' : value >= 0 ? 'text-emerald-600' : 'text-red-500'
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{fmtPct(value)}</span>
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

function WatchlistCard({ card, onRemove, onAddToPortfolio }: { card: WatchlistCardData; onRemove: () => void; onAddToPortfolio: () => void }) {
  const changeColor = card.change1d == null ? 'text-zinc-400' : card.change1d >= 0 ? 'text-emerald-600' : 'text-red-500'

  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-lg font-bold text-zinc-900 leading-tight">{card.ticker}</span>
          {card.name && (
            <span className="text-xs text-zinc-500 truncate max-w-45">{card.name}</span>
          )}
          <KeywordPills keywords={card.keywords} />
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="text-base font-semibold text-zinc-900">
            {fmtPrice(card.price, card.currency)}
          </span>
          <span className={`text-xs font-medium ${changeColor}`}>
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
          <p className="text-[11px] text-zinc-400 italic truncate max-w-50">&ldquo;{card.source}&rdquo;</p>
        ) : (
          <span className="text-[11px] text-zinc-300">Added {card.addedAt.toLocaleDateString()}</span>
        )}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <a
            href={`https://www.tradingview.com/symbols/${card.ticker}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium text-zinc-400 hover:text-blue-500 transition-colors"
          >
            TV
          </a>
          <a
            href={`https://app.koyfin.com/share/chart/simple/${card.ticker}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium text-zinc-400 hover:text-teal-500 transition-colors"
          >
            Koyfin
          </a>
          <button
            onClick={onAddToPortfolio}
            className="text-xs text-zinc-400 hover:text-indigo-600 transition-colors"
          >
            + Portfolio
          </button>
          <button
            onClick={onRemove}
            className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

export function WatchlistGrid({ cards }: { cards: WatchlistCardData[] }) {
  const [isPending, startTransition] = useTransition()
  const [addingCard, setAddingCard] = useState<WatchlistCardData | null>(null)

  return (
    <>
      <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
        {cards.map((card) => (
          <WatchlistCard
            key={card.id}
            card={card}
            onRemove={() => startTransition(() => removeFromWatchlist(card.id))}
            onAddToPortfolio={() => setAddingCard(card)}
          />
        ))}
      </div>

      {addingCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setAddingCard(null) }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">
                Add {addingCard.ticker} to Portfolio
              </h2>
              <button
                onClick={() => setAddingCard(null)}
                className="text-zinc-400 hover:text-zinc-700 text-lg leading-none transition-colors"
              >
                ✕
              </button>
            </div>
            <AddPositionForm
              defaultValues={{
                ticker: addingCard.ticker,
                name: addingCard.name ?? '',
                assetClass: 'stock',
                currency: addingCard.currency,
                avgBuyPrice: addingCard.price ?? undefined,
              }}
              onSuccess={() => setAddingCard(null)}
            />
          </div>
        </div>
      )}
    </>
  )
}
