import { NextRequest } from 'next/server'
import { gte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { portfolioSnapshots } from '@/lib/db/schema'

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get('range') ?? '3mo'

  const cutoff = rangeToDate(range)
  const rows = await db
    .select()
    .from(portfolioSnapshots)
    .where(gte(portfolioSnapshots.date, cutoff))
    .orderBy(portfolioSnapshots.date)

  return Response.json(rows)
}

function rangeToDate(range: string): string {
  const now = new Date()
  const map: Record<string, number> = {
    '1mo': 30,
    '3mo': 90,
    '6mo': 180,
    '1y': 365,
    all: 3650,
  }
  now.setDate(now.getDate() - (map[range] ?? 90))
  return now.toISOString().split('T')[0]
}
