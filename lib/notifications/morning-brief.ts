import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/db'
import { notificationLog } from '@/lib/db/schema'
import { fetchTrendingSymbols, fetchSymbolStream } from '@/lib/social/stocktwits'
import { fetchAllFeeds } from '@/lib/rss/fetch'
import type { RssItem } from '@/lib/rss/fetch'
import { sendTelegramMessage } from './telegram'

const anthropic = new Anthropic()

async function summarizeArticles(items: RssItem[]): Promise<string | null> {
  if (!items.length) return null
  const digest = items
    .map((i) => `- ${i.title}${i.summary ? `: ${i.summary}` : ''} (${i.source})`)
    .join('\n')
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Summarize the key market themes from these headlines in 2-3 sentences. Be concise and focus on what matters for an investor today.\n\n${digest}`,
      },
    ],
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text.trim() : null
}

const SENTIMENT_EMOJI: Record<string, string> = { Bullish: '🟢', Bearish: '🔴' }

export async function runMorningBrief(): Promise<void> {
  const lines: string[] = [
    `*📈 Morning Brief — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}*`,
  ]

  // StockTwits trending
  let trendingSymbols: Awaited<ReturnType<typeof fetchTrendingSymbols>> = []
  try {
    trendingSymbols = await fetchTrendingSymbols()
    if (trendingSymbols.length) {
      lines.push('', '*🔥 Trending on StockTwits:*')
      for (const s of trendingSymbols.slice(0, 5)) {
        lines.push(`• $${s.symbol} · ${s.watchlistCount.toLocaleString()} watching`)
      }
    }
  } catch {
    // StockTwits unavailable — skip section silently
  }

  // StockTwits messages for top 3 trending tickers
  if (trendingSymbols.length) {
    const topTickers = trendingSymbols.slice(0, 3).map((s) => s.symbol)
    const streams = await Promise.allSettled(
      topTickers.map((t) => fetchSymbolStream(t, 3))
    )
    const sentimentLines: string[] = []
    for (let i = 0; i < topTickers.length; i++) {
      const result = streams[i]
      if (result.status !== 'fulfilled') continue
      for (const msg of result.value) {
        const emoji = SENTIMENT_EMOJI[msg.sentiment ?? ''] ?? '⬜'
        const body = msg.body.replace(/\n+/g, ' ').slice(0, 120)
        sentimentLines.push(`${emoji} *$${topTickers[i]}:* ${body}`)
      }
    }
    if (sentimentLines.length) {
      lines.push('', '*💬 What they\'re saying:*')
      lines.push(...sentimentLines.slice(0, 6))
    }
  }

  // RSS headlines + AI summary
  try {
    const items = await fetchAllFeeds(4)
    if (items.length) {
      const summary = await summarizeArticles(items).catch(() => null)
      if (summary) {
        lines.push('', '*🤖 Market Summary:*', summary)
      }
      lines.push('', '*📰 Headlines:*')
      for (const item of items.slice(0, 6)) {
        lines.push(`• ${item.title} _(${item.source})_`)
      }
    }
  } catch {
    // RSS unavailable — skip
  }

  if (lines.length <= 1) {
    lines.push('', '_No data sources available right now._')
  }

  const text = lines.join('\n')
  const sentAt = new Date()

  try {
    await sendTelegramMessage(text)
    await db.insert(notificationLog).values({
      type: 'morning_brief',
      channel: 'telegram',
      status: 'sent',
      sentAt,
    })
  } catch (err) {
    await db.insert(notificationLog).values({
      type: 'morning_brief',
      channel: 'telegram',
      status: 'failed',
      errorMessage: String(err),
      sentAt,
    })
    throw err
  }
}
