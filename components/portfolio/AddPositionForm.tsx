'use client'

import { useActionState, useState } from 'react'
import { createPosition } from '@/app/actions/positions'
import { Button } from '@/components/ui/Button'

const ASSET_CLASSES = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'bond', label: 'Bond' },
  { value: 'commodity', label: 'Commodity' },
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF']

interface Props {
  onSuccess?: () => void
  defaultValues?: {
    ticker?: string
    name?: string
    assetClass?: string
    currency?: string
    avgBuyPrice?: number
  }
}

export function AddPositionForm({ onSuccess, defaultValues }: Props) {
  const [state, action, pending] = useActionState(createPosition, null)
  const [submitted, setSubmitted] = useState(false)

  if (state?.success && !submitted) {
    setSubmitted(true)
    onSuccess?.()
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Ticker *</label>
          <input
            name="ticker"
            placeholder="AAPL"
            required
            defaultValue={defaultValues?.ticker}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-colors uppercase"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Name *</label>
          <input
            name="name"
            placeholder="Apple Inc."
            required
            defaultValue={defaultValues?.name ?? ''}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Asset Class *</label>
          <select
            name="assetClass"
            required
            defaultValue={defaultValues?.assetClass ?? ''}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-colors"
          >
            <option value="" disabled>Select asset class…</option>
            {ASSET_CLASSES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Currency</label>
          <select
            name="currency"
            defaultValue={defaultValues?.currency ?? 'USD'}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-colors"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Quantity *</label>
          <input
            name="quantity"
            type="number"
            step="any"
            min="0"
            placeholder="10"
            required
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Avg Buy Price *</label>
          <input
            name="avgBuyPrice"
            type="number"
            step="any"
            min="0"
            placeholder="150.00"
            required
            defaultValue={defaultValues?.avgBuyPrice}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Notes</label>
        <textarea
          name="notes"
          rows={2}
          placeholder="Optional notes…"
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-colors resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <Button type="submit" loading={pending} className="w-full justify-center">
        Add Position
      </Button>
    </form>
  )
}
