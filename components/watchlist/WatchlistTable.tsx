'use client'

import { useTransition } from 'react'
import { removeFromWatchlist } from '@/app/actions/watchlist'
import type { WatchlistItem } from '@/lib/db/schema'

export function WatchlistTable({ items }: { items: WatchlistItem[] }) {
  const [isPending, startTransition] = useTransition()

  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-400 italic">
        No tickers yet. Send any message to your Telegram bot to get started.
      </p>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-100">
          <th className="text-left py-2 pr-4 font-medium text-zinc-500 w-24">Ticker</th>
          <th className="text-left py-2 pr-4 font-medium text-zinc-500">Name</th>
          <th className="text-left py-2 pr-4 font-medium text-zinc-500 hidden md:table-cell">Source</th>
          <th className="text-left py-2 font-medium text-zinc-500 w-28">Added</th>
          <th className="w-16" />
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-zinc-50 hover:bg-zinc-50">
            <td className="py-3 pr-4 font-semibold text-zinc-900">{item.ticker}</td>
            <td className="py-3 pr-4 text-zinc-600">{item.name ?? '—'}</td>
            <td className="py-3 pr-4 text-zinc-400 text-xs hidden md:table-cell max-w-xs truncate">
              {item.source ?? '—'}
            </td>
            <td className="py-3 text-zinc-400 text-xs whitespace-nowrap">
              {item.addedAt.toLocaleDateString()}
            </td>
            <td className="py-3 text-right">
              <button
                onClick={() => startTransition(() => removeFromWatchlist(item.id))}
                disabled={isPending}
                className="text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
