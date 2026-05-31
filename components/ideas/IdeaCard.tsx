'use client'

import { useTransition } from 'react'
import { Badge, signalBadgeVariant, assetClassBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { approveIdea, dismissIdea } from '@/app/actions/ideas'
import type { AiIdea } from '@/lib/db/schema'
import { formatDate } from '@/lib/utils/format'

const signalLabels: Record<string, string> = {
  buy: '↑ Buy',
  sell: '↓ Sell',
  hold: '◉ Hold',
  rebalance: '⇄ Rebalance',
  risk_flag: '⚠ Risk',
  news: '📰 News',
}

interface Props {
  idea: AiIdea
}

export function IdeaCard({ idea }: Props) {
  const [isPending, startTransition] = useTransition()
  const sources = idea.sources ? (JSON.parse(idea.sources) as string[]) : []

  function approve() {
    startTransition(() => approveIdea(idea.id))
  }
  function dismiss() {
    startTransition(() => dismissIdea(idea.id))
  }

  return (
    <div className={`bg-white rounded-xl border p-5 space-y-3 transition-opacity ${
      idea.status !== 'pending' ? 'opacity-60' : ''
    } ${idea.status === 'approved' ? 'border-emerald-300' : idea.status === 'dismissed' ? 'border-zinc-200' : 'border-zinc-200 hover:border-indigo-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={signalBadgeVariant(idea.signalType)}>
            {signalLabels[idea.signalType] ?? idea.signalType}
          </Badge>
          {idea.ticker && (
            <span className="font-semibold text-zinc-900 text-sm">{idea.ticker}</span>
          )}
          {idea.assetClass && idea.assetClass !== 'portfolio' && (
            <Badge variant={assetClassBadge(idea.assetClass)} className="capitalize">
              {idea.assetClass}
            </Badge>
          )}
          <Badge variant={idea.riskLevel === 'high' ? 'red' : idea.riskLevel === 'medium' ? 'yellow' : 'green'}>
            {idea.riskLevel} risk
          </Badge>
        </div>
        <span className="text-xs text-zinc-600 shrink-0">{formatDate(idea.generatedAt)}</span>
      </div>

      <h3 className="font-semibold text-zinc-900 text-sm">{idea.title}</h3>
      <p className="text-sm text-zinc-600 leading-relaxed">{idea.reasoning}</p>

      {sources.length > 0 && (
        <div className="text-xs text-zinc-600 space-y-0.5">
          {sources.map((s, i) => (
            <div key={i}>• {s}</div>
          ))}
        </div>
      )}

      {idea.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <Button variant="primary" size="sm" onClick={approve} loading={isPending}>
            Approve
          </Button>
          <Button variant="ghost" size="sm" onClick={dismiss} disabled={isPending} className="text-zinc-700">
            Dismiss
          </Button>
        </div>
      )}

      {idea.status === 'approved' && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
          ✓ Approved
        </span>
      )}
      {idea.status === 'dismissed' && (
        <span className="inline-flex items-center gap-1 text-xs text-zinc-600">
          Dismissed
        </span>
      )}
    </div>
  )
}
