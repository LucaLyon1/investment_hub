'use client'

import { useTransition } from 'react'
import { refreshWatchlistData } from '@/app/actions/watchlist'

export function WatchlistRefresher() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => refreshWatchlistData())}
      disabled={isPending}
      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-40"
      title="Force-refresh market data from FMP"
    >
      <span className={isPending ? 'animate-spin inline-block' : ''}>↻</span>
      {isPending ? 'Refreshing…' : 'Refresh data'}
    </button>
  )
}
