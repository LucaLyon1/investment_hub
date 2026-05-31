import { NextRequest } from 'next/server'
import { getMarketProvider } from '@/lib/market'

type Range = '1mo' | '3mo' | '6mo' | '1y' | '5y'
const VALID_RANGES: Range[] = ['1mo', '3mo', '6mo', '1y', '5y']

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')?.toUpperCase()
  const range = (req.nextUrl.searchParams.get('range') ?? '1y') as Range

  if (!ticker) return Response.json({ error: 'ticker required' }, { status: 400 })
  if (!VALID_RANGES.includes(range)) return Response.json({ error: 'invalid range' }, { status: 400 })

  try {
    const provider = getMarketProvider()
    const history = await provider.getHistory(ticker, range)
    return Response.json(history)
  } catch {
    return Response.json({ error: 'Failed to fetch history' }, { status: 502 })
  }
}
