export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { positions, priceCache, portfolioSnapshots } from '@/lib/db/schema'
import { computePortfolioSummary, computePositionsWithMetrics, buildPriceMap } from '@/lib/portfolio/calculations'
import { PortfolioSummaryBar } from '@/components/portfolio/PortfolioSummaryBar'
import { AllocationPie } from '@/components/portfolio/AllocationPie'
import { PerformanceChart } from '@/components/portfolio/PerformanceChart'
import { PositionTable } from '@/components/portfolio/PositionTable'
import { AddPositionForm } from '@/components/portfolio/AddPositionForm'
import { AnalysisPanel } from '@/components/portfolio/AnalysisPanel'
import { PriceRefresher } from '@/components/portfolio/PriceRefresher'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

export default async function DashboardPage() {
  const allPositions = await db.select().from(positions)
  const allPrices = await db.select().from(priceCache)
  const priceMap = buildPriceMap(allPrices)
  const summary = computePortfolioSummary(allPositions, priceMap)
  const positionsWithMetrics = computePositionsWithMetrics(allPositions, priceMap)

  const snapshots = await db
    .select()
    .from(portfolioSnapshots)
    .orderBy(portfolioSnapshots.date)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-600 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="pt-1">
          <PriceRefresher />
        </div>
      </div>

      <PortfolioSummaryBar summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Allocation</h2>
          </CardHeader>
          <CardContent>
            <AllocationPie allocation={summary.allocation} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Performance</h2>
          </CardHeader>
          <CardContent>
            <PerformanceChart snapshots={snapshots} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Add Position</h2>
        </CardHeader>
        <CardContent>
          <AddPositionForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Positions</h2>
        </CardHeader>
        <PositionTable positions={positionsWithMetrics as Parameters<typeof PositionTable>[0]['positions']} />
      </Card>

      <AnalysisPanel />
    </div>
  )
}
