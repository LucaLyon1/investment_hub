import { formatCurrency, formatPercent } from '@/lib/utils/format'
import type { PortfolioSummary } from '@/lib/portfolio/calculations'

interface Props {
  summary: PortfolioSummary
}

export function PortfolioSummaryBar({ summary }: Props) {
  const isPositiveDay = summary.dayPnl >= 0
  const isPositiveTotal = summary.totalPnl >= 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Portfolio Value"
        value={formatCurrency(summary.totalValue)}
        sub={`${summary.positionCount} position${summary.positionCount !== 1 ? 's' : ''}`}
      />
      <StatCard
        label="Today's P&L"
        value={formatCurrency(summary.dayPnl)}
        sub={formatPercent(summary.dayPnlPct)}
        positive={isPositiveDay}
      />
      <StatCard
        label="Total P&L"
        value={formatCurrency(summary.totalPnl)}
        sub={formatPercent(summary.totalPnlPct)}
        positive={isPositiveTotal}
      />
      <StatCard
        label="Cost Basis"
        value={formatCurrency(summary.totalCost)}
        sub="total invested"
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string
  value: string
  sub: string
  positive?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 px-5 py-4">
      <p className="text-xs text-zinc-600 font-medium uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
      <p
        className={`mt-0.5 text-sm font-medium ${
          positive === undefined
            ? 'text-zinc-600'
            : positive
            ? 'text-emerald-600'
            : 'text-red-600'
        }`}
      >
        {sub}
      </p>
    </div>
  )
}
