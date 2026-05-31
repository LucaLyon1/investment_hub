import { db } from '@/lib/db'
import { positions, priceCache, portfolioSnapshots, notificationLog } from '@/lib/db/schema'
import { computePortfolioSummary, buildPriceMap } from '@/lib/portfolio/calculations'
import { formatCurrency, formatPercent } from '@/lib/utils/format'
import { runAgent } from '@/lib/ai/agent'
import { sendTelegramMessage } from './telegram'

export async function runMorningRecap(): Promise<void> {
  const allPositions = await db.select().from(positions)
  const allPrices = await db.select().from(priceCache)
  const priceMap = buildPriceMap(allPrices)
  const summary = computePortfolioSummary(allPositions, priceMap)

  const agentResult = await runAgent(
    'morning_recap',
    'Generate my morning investment recap.'
  )

  const recap = agentResult.recapData

  // Build Telegram message
  const sign = (n: number) => (n >= 0 ? '+' : '')
  const tgLines = [
    `*📊 Morning Recap — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}*`,
    '',
    `*Portfolio:* ${formatCurrency(summary.totalValue)}`,
    `*Today:* ${sign(summary.dayPnl)}${formatCurrency(summary.dayPnl)} (${sign(summary.dayPnlPct)}${summary.dayPnlPct.toFixed(2)}%)`,
    `*Total P&L:* ${sign(summary.totalPnl)}${formatCurrency(summary.totalPnl)} (${formatPercent(summary.totalPnlPct)})`,
  ]

  if (recap?.overnightSummary) {
    tgLines.push('', `📰 *Market*: ${recap.overnightSummary}`)
  }

  if (recap?.actionItems?.length) {
    tgLines.push('', '*🎯 Action Items:*')
    for (const item of recap.actionItems.slice(0, 3)) {
      const emoji = { buy: '🟢', sell: '🔴', hold: '🟡', rebalance: '🔵', risk_flag: '⚠️', news: '📰' }[item.signalType] ?? '•'
      tgLines.push(`${emoji} *${item.title}*`, `  ${item.reasoning}`)
    }
  }

  if (recap?.headlines?.length) {
    tgLines.push('', '*📰 Headlines:*')
    for (const h of recap.headlines.slice(0, 3)) {
      tgLines.push(`• ${h.title} _(${h.source})_`)
    }
  }

  const telegramText = tgLines.join('\n')
  const today = new Date().toISOString().split('T')[0]

  // Persist daily snapshot
  await db
    .insert(portfolioSnapshots)
    .values({
      date: today,
      totalValue: summary.totalValue,
      totalCost: summary.totalCost,
      totalPnl: summary.totalPnl,
      pnlPct: summary.totalPnlPct,
    })
    .onConflictDoNothing()

  const sentAt = new Date()

  try {
    await sendTelegramMessage(telegramText)
    await db.insert(notificationLog).values({
      type: 'morning_recap',
      channel: 'telegram',
      status: 'sent',
      sentAt,
    })
  } catch (err) {
    await db.insert(notificationLog).values({
      type: 'morning_recap',
      channel: 'telegram',
      status: 'failed',
      errorMessage: String(err),
      sentAt,
    })
  }
}
