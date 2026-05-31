import { db } from '@/lib/db'
import { positions, priceCache } from '@/lib/db/schema'
import { computePortfolioSummary, buildPriceMap } from '@/lib/portfolio/calculations'

export async function GET() {
  const allPositions = await db.select().from(positions)
  const allPrices = await db.select().from(priceCache)
  const priceMap = buildPriceMap(allPrices)
  const summary = computePortfolioSummary(allPositions, priceMap)
  return Response.json(summary)
}
