import { NextRequest } from 'next/server'
import { sendTelegramMessage } from '@/lib/notifications/telegram'
import { runAgent } from '@/lib/ai/agent'

// Telegram caps message length at 4096 chars. Split on paragraph boundaries if needed.
function splitForTelegram(text: string, limit = 4000): string[] {
  if (text.length <= limit) return [text]
  const chunks: string[] = []
  let remaining = text
  while (remaining.length > limit) {
    // Try to split at a double newline before the limit
    const cut = remaining.lastIndexOf('\n\n', limit)
    const splitAt = cut > limit / 2 ? cut : limit
    chunks.push(remaining.slice(0, splitAt).trim())
    remaining = remaining.slice(splitAt).trim()
  }
  if (remaining) chunks.push(remaining)
  return chunks
}

async function runResearch(text: string): Promise<void> {
  try {
    const result = await runAgent('research', text)
    const chunks = splitForTelegram(result.text)
    for (const chunk of chunks) {
      await sendTelegramMessage(chunk)
    }
  } catch (err) {
    console.error('[telegram/research]', err)
    await sendTelegramMessage('Research failed. Please try again.').catch(() => {})
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
      await sendTelegramMessage("Send me a message about any stock or investment and I'll research it for you.")
      return ok()
    }

    // Acknowledge immediately so Telegram doesn't retry, then research in background
    await sendTelegramMessage('_Analyzing..._')
    void runResearch(text)
  } catch (err) {
    console.error('[telegram/webhook]', err)
  }
  return ok()
}

function ok() {
  return Response.json({}, { status: 200 })
}
