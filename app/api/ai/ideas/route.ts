import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aiIdeas } from '@/lib/db/schema'
import { runAgent } from '@/lib/ai/agent'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const filters = []

  const status = sp.get('status')
  if (status) filters.push(eq(aiIdeas.status, status as 'pending' | 'approved' | 'dismissed'))

  const assetClass = sp.get('assetClass')
  if (assetClass) filters.push(eq(aiIdeas.assetClass, assetClass as 'stock' | 'etf' | 'bond' | 'commodity' | 'portfolio'))

  const signalType = sp.get('signalType')
  if (signalType) filters.push(eq(aiIdeas.signalType, signalType as 'buy' | 'sell' | 'hold' | 'rebalance' | 'risk_flag' | 'news'))

  const riskLevel = sp.get('riskLevel')
  if (riskLevel) filters.push(eq(aiIdeas.riskLevel, riskLevel as 'low' | 'medium' | 'high'))

  const ideas = await db
    .select()
    .from(aiIdeas)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(aiIdeas.generatedAt)

  return Response.json(ideas.reverse())
}

export async function POST() {
  // Fire and forget — agent runs, persists ideas, client can poll GET
  runAgent(
    'ideas',
    'Analyze the current market and my portfolio. Generate 3-5 actionable investment ideas.'
  ).catch(console.error)

  return Response.json({ status: 'generating' }, { status: 202 })
}
