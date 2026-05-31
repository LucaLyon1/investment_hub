'use client'

import { useState, useTransition } from 'react'
import { formatCurrency, formatPercent } from '@/lib/utils/format'
import { Badge, assetClassBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { deletePosition } from '@/app/actions/positions'

interface PositionRow {
  id: string
  ticker: string
  name: string
  assetClass: string
  quantity: number
  avgBuyPrice: number
  currency: string
  currentPrice: number
  currentValue: number
  costBasis: number
  pnl: number
  pnlPct: number
  changePct1d: number
}

type SortKey = 'ticker' | 'currentValue' | 'pnlPct' | 'changePct1d'

interface Props {
  positions: PositionRow[]
}

export function PositionTable({ positions }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('currentValue')
  const [sortAsc, setSortAsc] = useState(false)
  const [isPending, startTransition] = useTransition()

  const sorted = [...positions].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this position?')) return
    startTransition(() => deletePosition(id))
  }

  const th = (key: SortKey, label: string) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-zinc-600 uppercase tracking-wide cursor-pointer hover:text-zinc-900 select-none"
      onClick={() => toggleSort(key)}
    >
      {label} {sortKey === key ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  )

  if (positions.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-600 text-sm">
        No positions yet. Add your first one above.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 border-b border-zinc-200">
          <tr>
            {th('ticker', 'Ticker')}
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 uppercase tracking-wide">Type</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-600 uppercase tracking-wide">Qty</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-600 uppercase tracking-wide">Avg Cost</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-600 uppercase tracking-wide">Price</th>
            {th('currentValue', 'Value')}
            {th('pnlPct', 'P&L')}
            {th('changePct1d', '1D')}
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {sorted.map((pos) => (
            <tr key={pos.id} className="hover:bg-zinc-50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-semibold text-zinc-900">{pos.ticker}</div>
                <div className="text-xs text-zinc-600 truncate max-w-[120px]">{pos.name}</div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={assetClassBadge(pos.assetClass)} className="capitalize">
                  {pos.assetClass}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right text-zinc-700">{pos.quantity}</td>
              <td className="px-4 py-3 text-right text-zinc-700">{formatCurrency(pos.avgBuyPrice, pos.currency)}</td>
              <td className="px-4 py-3 text-right text-zinc-700">{formatCurrency(pos.currentPrice, pos.currency)}</td>
              <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatCurrency(pos.currentValue, pos.currency)}</td>
              <td className={`px-4 py-3 text-right font-medium ${pos.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <div>{formatCurrency(pos.pnl, pos.currency)}</div>
                <div className="text-xs">{formatPercent(pos.pnlPct)}</div>
              </td>
              <td className={`px-4 py-3 text-right font-medium ${pos.changePct1d >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatPercent(pos.changePct1d)}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(pos.id)}
                  disabled={isPending}
                  className="text-zinc-600 hover:text-red-600"
                >
                  ✕
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
