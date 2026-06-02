import { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { watchlist } from '@/lib/db/schema'
import { sendTelegramMessage } from '@/lib/notifications/telegram'
import { getMarketProvider } from '@/lib/market'

function extractTickers(text: string): string[] {
  const matches = text.match(/\$([A-Z0-9]{1,10})/gi) ?? []
  return [...new Set(matches.map((m) => m.slice(1).toUpperCase()))]
}

// Always return 200 — Telegram retries non-200 responses for up to 48 hours
export async function POST(req: NextRequest) {
  try {
    // Guard 1: webhook secret header (set when registering the webhook)
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secret) {
      if (req.headers.get('x-telegram-bot-api-secret-token') !== secret) return ok()
    }

    const update = await req.json()
    const message = update?.message
    if (!message) return ok()

    // Guard 2: only accept messages from the configured chat
    if (message.chat?.id?.toString() !== process.env.TELEGRAM_CHAT_ID) return ok()

    const text = message.text ?? message.caption ?? ''

    if (!message.text && !message.caption) {
      await sendTelegramMessage("Send me text with $TICKER symbols and I'll add them to your watchlist.")
      return ok()
    }

    const tickers = extractTickers(text)

    if (tickers.length === 0) {
      await sendTelegramMessage('No tickers found in that message.')
      return ok()
    }

    const source =
      typeof message.text === 'string'
        ? message.text.slice(0, 120)
        : (message.caption?.slice(0, 120) ?? null)

    const addedTickers: string[] = []

    await Promise.allSettled(
      tickers.map(async (ticker) => {
        let name: string | null = null
        try {
          const quote = await getMarketProvider().getQuote(ticker)
          name = quote.name ?? null
        } catch {
          // Unknown ticker — insert without name
        }

        const inserted = await db
          .insert(watchlist)
          .values({ id: nanoid(), ticker, name, source, addedAt: new Date() })
          .onConflictDoNothing()
          .returning()

        if (inserted.length > 0) addedTickers.push(ticker)
      })
    )

    const skipped = tickers.length - addedTickers.length
    const lines = ['*Watchlist updated!*']
    if (addedTickers.length) lines.push(`Added: ${addedTickers.map((t) => `\`${t}\``).join(' ')}`)
    if (skipped > 0) lines.push(`Already in watchlist: ${skipped} ticker(s) skipped`)

    await sendTelegramMessage(lines.join('\n'))
  } catch (err) {
    console.error('[telegram/webhook]', err)
    try {
      await sendTelegramMessage('Internal error. Please try again.')
    } catch {}
  }
  return ok()
}

function ok() {
  return Response.json({}, { status: 200 })
}
