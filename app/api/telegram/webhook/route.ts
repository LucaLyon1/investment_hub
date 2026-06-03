import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { watchlist } from '@/lib/db/schema'
import { sendTelegramMessage } from '@/lib/notifications/telegram'
import { getMarketProvider } from '@/lib/market'
import { getMarketDataBatch } from '@/lib/market/cache'
import { runAgent } from '@/lib/ai/agent'

const client = new Anthropic()

async function extractTickers(text: string): Promise<string[]> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 64,
    system:
      'Extract stock/ETF ticker symbols from the user message. Map company names to tickers using your knowledge (Apple → AAPL, Nvidia → NVDA, Palantir → PLTR, etc.). Return ONLY a valid JSON array of uppercase ticker strings, e.g. ["NVDA"] or ["AAPL","MSFT"]. If none, return []. No explanation.',
    messages: [{ role: 'user', content: text }],
  })
  const raw = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '[]'
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

async function researchAndStore(ticker: string): Promise<void> {
  try {
    const result = await runAgent('research', ticker)
    if (result.text.trim()) {
      await db
        .update(watchlist)
        .set({ aiReason: result.text.trim() })
        .where(eq(watchlist.ticker, ticker))
    }
  } catch (err) {
    console.error(`[telegram/research] ${ticker}`, err)
  }
}

// Always return 200 — Telegram retries non-200 responses for up to 48 hours
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secret) {
      if (req.headers.get('x-telegram-bot-api-secret-token') !== secret) return ok()
    }

    const update = await req.json()
    const message = update?.message
    if (!message) return ok()

    if (message.chat?.id?.toString() !== process.env.TELEGRAM_CHAT_ID) return ok()

    const text: string = message.text ?? message.caption ?? ''
    if (!text.trim()) {
      await sendTelegramMessage("Send me a message mentioning a stock or company and I'll add it to your watchlist.")
      return ok()
    }

    const tickers = await extractTickers(text)

    if (!tickers.length) {
      await sendTelegramMessage("I couldn't identify any ticker. Try mentioning a company name or symbol.")
      return ok()
    }

    const source = text.slice(0, 120)
    const addedTickers: string[] = []

    await Promise.allSettled(
      tickers.map(async (ticker) => {
        let name: string | null = null
        try {
          const quote = await getMarketProvider().getQuote(ticker)
          name = quote.name ?? null
        } catch {}

        const inserted = await db
          .insert(watchlist)
          .values({ id: nanoid(), ticker, name, source, addedAt: new Date() })
          .onConflictDoNothing()
          .returning()

        if (inserted.length > 0) {
          addedTickers.push(ticker)
          getMarketDataBatch([ticker]).catch(() => {})
        }
      })
    )

    const skipped = tickers.length - addedTickers.length
    const lines: string[] = []
    if (addedTickers.length) {
      lines.push(`Added to watchlist: ${addedTickers.map((t) => `*${t}*`).join(', ')}`)
      lines.push('Research is loading — check your dashboard.')
    }
    if (skipped > 0) lines.push(`${skipped} ticker(s) already in watchlist.`)

    await sendTelegramMessage(lines.join('\n'))

    // Run research in background and persist to aiReason
    for (const ticker of addedTickers) {
      void researchAndStore(ticker)
    }
  } catch (err) {
    console.error('[telegram/webhook]', err)
    try {
      await sendTelegramMessage('Something went wrong. Please try again.')
    } catch {}
  }
  return ok()
}

function ok() {
  return Response.json({}, { status: 200 })
}
