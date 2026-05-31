'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

const SIGNAL_TYPES = ['buy', 'sell', 'hold', 'rebalance', 'risk_flag', 'news']
const RISK_LEVELS = ['low', 'medium', 'high']
const STATUSES = ['pending', 'approved', 'dismissed']

export function IdeaFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'all') params.delete(key)
      else params.set(key, value)
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const current = (key: string) => searchParams.get(key) ?? 'all'

  function FilterGroup({ label, filterKey, options }: { label: string; filterKey: string; options: string[] }) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-700 font-medium">{label}:</span>
        {['all', ...options].map((opt) => (
          <button
            key={opt}
            onClick={() => setFilter(filterKey, opt)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
              current(filterKey) === opt
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {opt === 'all' ? 'All' : opt.replace('_', ' ')}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterGroup label="Signal" filterKey="signalType" options={SIGNAL_TYPES} />
      <FilterGroup label="Risk" filterKey="riskLevel" options={RISK_LEVELS} />
      <FilterGroup label="Status" filterKey="status" options={STATUSES} />
    </div>
  )
}
