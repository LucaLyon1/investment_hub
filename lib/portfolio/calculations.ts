import type { Position, PriceCache } from '@/lib/db/schema'

export interface PositionWithMetrics extends Position {
  currentPrice: number
  currentValue: number
  costBasis: number
  pnl: number
  pnlPct: number
  change1d: number
  changePct1d: number
  allocationPct: number
}

export interface PortfolioSummary {
  totalValue: number
  totalCost: number
  totalPnl: number
  totalPnlPct: number
  dayPnl: number
  dayPnlPct: number
  positionCount: number
  allocation: AllocationSlice[]
}

export interface AllocationSlice {
  assetClass: string
  value: number
  pct: number
}

export function computePositionsWithMetrics(
  positions: Position[],
  prices: Map<string, PriceCache>
): PositionWithMetrics[] {
  const totalValue = positions.reduce((sum, p) => {
    const cached = prices.get(p.ticker)
    const price = cached?.price ?? p.avgBuyPrice
    return sum + price * p.quantity
  }, 0)

  return positions.map((p) => {
    const cached = prices.get(p.ticker)
    const currentPrice = cached?.price ?? p.avgBuyPrice
    const currentValue = currentPrice * p.quantity
    const costBasis = p.avgBuyPrice * p.quantity
    const pnl = currentValue - costBasis
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0
    const change1d = (cached?.change1d ?? 0) * p.quantity
    const changePct1d = cached?.changePct1d ?? 0
    const allocationPct = totalValue > 0 ? (currentValue / totalValue) * 100 : 0

    return {
      ...p,
      currentPrice,
      currentValue,
      costBasis,
      pnl,
      pnlPct,
      change1d,
      changePct1d,
      allocationPct,
    }
  })
}

export function computePortfolioSummary(
  positions: Position[],
  prices: Map<string, PriceCache>
): PortfolioSummary {
  const metrics = computePositionsWithMetrics(positions, prices)

  const totalValue = metrics.reduce((s, p) => s + p.currentValue, 0)
  const totalCost = metrics.reduce((s, p) => s + p.costBasis, 0)
  const totalPnl = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
  const dayPnl = metrics.reduce((s, p) => s + p.change1d, 0)
  const dayPnlPct = totalValue > 0 ? (dayPnl / (totalValue - dayPnl)) * 100 : 0

  const byClass = new Map<string, number>()
  for (const p of metrics) {
    byClass.set(p.assetClass, (byClass.get(p.assetClass) ?? 0) + p.currentValue)
  }

  const allocation: AllocationSlice[] = Array.from(byClass.entries()).map(([assetClass, value]) => ({
    assetClass,
    value,
    pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
  }))

  return {
    totalValue,
    totalCost,
    totalPnl,
    totalPnlPct,
    dayPnl,
    dayPnlPct,
    positionCount: positions.length,
    allocation,
  }
}

export function buildPriceMap(rows: PriceCache[]): Map<string, PriceCache> {
  return new Map(rows.map((r) => [r.ticker, r]))
}
