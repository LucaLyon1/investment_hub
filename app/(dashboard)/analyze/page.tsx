import { StockAnalysisClient } from './StockAnalysisClient'

interface Props {
  searchParams: Promise<{ ticker?: string }>
}

export default async function AnalyzePage({ searchParams }: Props) {
  const { ticker } = await searchParams
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Stock Analysis</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Enter any ticker for an AI-powered deep dive — charts, fundamentals, bull/bear case, and a verdict.
        </p>
      </div>
      <StockAnalysisClient initialTicker={ticker?.toUpperCase()} />
    </div>
  )
}
