import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { watchlist } from '@/lib/db/schema'
import { sendTelegramMessage } from '@/lib/notifications/telegram'
import { getMarketProvider } from '@/lib/market'

const client = new Anthropic()

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

    let claudeContent: Anthropic.MessageParam['content']

    if (message.photo) {
      // Get largest photo variant, download it and send as base64 to Claude vision
      const photo = message.photo[message.photo.length - 1]
      const fileRes = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`
      )
      const fileData = await fileRes.json()
      const imgRes = await fetch(
        `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`
      )
      const base64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64')
      claudeContent = [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
        { type: 'text', text: message.caption ?? 'Extract tickers from this image.' },
      ]
    } else if (message.text) {
      claudeContent = message.text
    } else {
      await sendTelegramMessage("Send me text or an image and I'll extract the tickers.")
      return ok()
    }

    // One-shot Claude call — no agentic loop needed for simple extraction
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system:
        'Extract all stock, ETF, or crypto ticker symbols from the content. ' +
        'RULE 1: Any word immediately preceded by a $ sign is a cashtag — treat it as a ticker and include it unconditionally, regardless of length, format, or whether you recognize it (e.g. $SU, $LR, $2CRSI are all valid tickers). ' +
        'RULE 2: Also extract tickers that appear as plain uppercase or are implied by company names. ' +
        'Strip any leading $ sign from results. Uppercase all results. ' +
        'The content may be in any language — focus on ticker symbols, not language. ' +
        'Return ONLY a valid JSON array of uppercase ticker strings, e.g. ["AAPL","TSLA"]. ' +
        'If none are found, return []. No explanation.',
      messages: [{ role: 'user', content: claudeContent }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'
    let tickers: string[] = []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) tickers = parsed.filter((t) => typeof t === 'string')
    } catch {
      // Claude returned something unparseable — treat as no tickers found
    }

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
