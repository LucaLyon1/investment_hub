'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { refreshPrices } from '@/app/actions/prices'

export function PriceRefresher() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isPending, startTransition] = useTransition()

  const doRefresh = useCallback(() => {
    startTransition(async () => {
      await refreshPrices()
      setLastUpdated(new Date())
    })
  }, [])

  useEffect(() => {
    doRefresh()
    const id = setInterval(doRefresh, 60_000)
    return () => clearInterval(id)
  }, [doRefresh])

  return (
    <div className="flex items-center gap-3 text-xs text-zinc-400">
      {lastUpdated && (
        <span>
          Prices updated at{' '}
          <span className="text-zinc-500 font-medium tabular-nums">
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </span>
      )}
      <button
        onClick={doRefresh}
        disabled={isPending}
        className="flex items-center gap-1 hover:text-zinc-600 transition-colors disabled:opacity-40"
        title="Refresh prices"
      >
        <span className={isPending ? 'animate-spin inline-block' : ''}>↻</span>
        {isPending ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  )
}
