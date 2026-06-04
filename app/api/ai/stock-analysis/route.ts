import type { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { YahooFinanceProvider } from '@/lib/market/yahoo'
import { buildStockAnalysisSystemPrompt } from '@/lib/ai/prompts'
import { fetchSymbolStream } from '@/lib/social/stocktwits'

const client = new Anthropic()
// Always use Yahoo for stock analysis — it provides forwardPE, sector, priceToBook
// for free without any API key, regardless of whether FMP_SECRET is configured.
const provider = new YahooFinanceProvider()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ticker: string | undefined = body?.ticker
    if (!ticker) {
      return Response.json({ error: 'ticker required' }, { status: 400 })
    }

    const symbol = ticker.toUpperCase().trim()

    const [quoteResult, history1yResult, history3moResult, newsResult, sentimentResult, fundamentalsResult] =
      await Promise.allSettled([
        provider.getQuote(symbol),
        provider.getHistory(symbol, '1y'),
        provider.getHistory(symbol, '3mo'),
        provider.searchNews(symbol, 8),
        process.env.STOCKTWITS_USERNAME && process.env.STOCKTWITS_PASSWORD
          ? fetchSymbolStream(symbol, 30)
          : Promise.resolve(null),
        provider.getFundamentals(symbol),
      ])

    if (quoteResult.status === 'rejected') {
      return Response.json(
        { error: `Could not fetch data for "${symbol}". Is this a valid ticker? (${String(quoteResult.reason)})` },
        { status: 404 }
      )
    }

    const rawData = {
      quote: quoteResult.value,
      history1y: history1yResult.status === 'fulfilled' ? history1yResult.value : [],
      history3mo: history3moResult.status === 'fulfilled' ? history3moResult.value : [],
      news: newsResult.status === 'fulfilled' ? newsResult.value : [],
      sentiment: sentimentResult.status === 'fulfilled' ? sentimentResult.value : null,
      fundamentals: fundamentalsResult.status === 'fulfilled' ? fundamentalsResult.value : {},
    }

    const systemPrompt = buildStockAnalysisSystemPrompt(new Date().toISOString().split('T')[0])
    const userMessage = `Analyze ${symbol} and return the JSON analysis.\n\nRaw data:\n${JSON.stringify(rawData, null, 2)}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'No text response from AI' }, { status: 500 })
    }

    // Extract the first complete JSON object from the response
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json(
        { error: 'AI did not return valid JSON', raw: textBlock.text.slice(0, 500) },
        { status: 500 }
      )
    }

    try {
      const analysis = JSON.parse(jsonMatch[0])
      return Response.json(analysis)
    } catch {
      return Response.json(
        { error: 'Failed to parse AI response', raw: textBlock.text.slice(0, 500) },
        { status: 500 }
      )
    }
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
