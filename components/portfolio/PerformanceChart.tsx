'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { PortfolioSnapshot } from '@/lib/db/schema'
import { formatCurrency, formatShortDate } from '@/lib/utils/format'

interface Props {
  snapshots: PortfolioSnapshot[]
}

export function PerformanceChart({ snapshots }: Props) {
  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
        Performance data will appear after the first daily recap
      </div>
    )
  }

  const data = snapshots.map((s) => ({
    date: formatShortDate(s.date),
    value: s.totalValue,
    pnl: s.totalPnl,
  }))

  const isPositive = snapshots[snapshots.length - 1].totalPnl >= 0

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={isPositive ? '#10b981' : '#ef4444'}
              stopOpacity={0.2}
            />
            <stop
              offset="95%"
              stopColor={isPositive ? '#10b981' : '#ef4444'}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v, 'USD', true)}
          width={60}
        />
        <Tooltip
          formatter={(v) => [formatCurrency(Number(v)), 'Value']}
          labelStyle={{ fontSize: 12, color: '#64748b' }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth={2}
          fill="url(#grad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
