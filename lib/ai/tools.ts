import type { Tool, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { db } from '@/lib/db'
import { positions, priceCache } from '@/lib/db/schema'
import { getMarketProvider } from '@/lib/market'
import { computePortfolioSummary, buildPriceMap } from '@/lib/portfolio/calculations'
import { fetchAllFeeds } from '@/lib/rss/fetch'
import { fetchRedditPosts } from '@/lib/social/reddit'
import { fetchTrendingSymbols, fetchSymbolStream } from '@/lib/social/stocktwits'

export const TOOL_DEFINITIONS: Tool[] = [
  {
    name: 'fetch_market_data',
    description:
      'Fetch current price, daily change, 52-week high/low, and optionally recent price history for one or more tickers.',
    input_schema: {
      type: 'object',
      properties: {
        tickers: { type: 'array', items: { type: 'string' }, description: 'List of ticker symbols' },
        includeHistory: { type: 'boolean', description: 'Include 3-month price history' },
      },
      required: ['tickers'],
    },
  },
  {
    name: 'get_portfolio',
    description:
      "Get the user's current portfolio positions with P&L, allocation percentages, and summary metrics.",
    input_schema: {
      type: 'object',
      properties: {
        includePerformanceHistory: {
          type: 'boolean',
          description: 'Include historical portfolio snapshots',
        },
      },
    },
  },
  {
    name: 'search_news',
    description: 'Search for recent financial news and market commentary for a ticker or topic.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (ticker or topic)' },
        maxResults: { type: 'integer', description: 'Max results (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_rss_feeds',
    description: "Fetch the latest headlines from the user's subscribed RSS news feeds.",
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'fetch_social_sentiment',
    description:
      'Fetch retail investor sentiment from Reddit (r/wallstreetbets, r/investing, r/stocks) and StockTwits. Returns Reddit hot posts and StockTwits trending symbols. Pass a ticker to also get StockTwits messages with bullish/bearish sentiment for that symbol.',
    input_schema: {
      type: 'object',
      properties: {
        subreddits: {
          type: 'array',
          items: { type: 'string' },
          description: 'Subreddits to scan (default: wallstreetbets, investing, stocks)',
        },
        ticker: {
          type: 'string',
          description: 'Optional ticker to fetch StockTwits message stream for (e.g. "AAPL")',
        },
      },
    },
  },
]

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<ToolResultBlockParam['content']> {
  try {
    if (toolName === 'fetch_market_data') {
      const tickers = toolInput.tickers as string[]
      const includeHistory = toolInput.includeHistory as boolean | undefined
      const provider = getMarketProvider()
      const quotes = await provider.getQuotes(tickers)
      const result: Record<string, unknown> = { quotes }
      if (includeHistory) {
        const histories: Record<string, unknown> = {}
        await Promise.all(
          tickers.map(async (t) => {
            histories[t] = await provider.getHistory(t, '3mo')
          })
        )
        result.history = histories
      }
      return JSON.stringify(result)
    }

    if (toolName === 'get_portfolio') {
      const allPositions = await db.select().from(positions)
      const allPrices = await db.select().from(priceCache)
      const priceMap = buildPriceMap(allPrices)
      const summary = computePortfolioSummary(allPositions, priceMap)
      return JSON.stringify({ positions: allPositions, summary })
    }

    if (toolName === 'search_news') {
      const provider = getMarketProvider()
      const news = await provider.searchNews(
        toolInput.query as string,
        (toolInput.maxResults as number) ?? 5
      )
      return JSON.stringify(news)
    }

    if (toolName === 'read_rss_feeds') {
      const items = await fetchAllFeeds()
      return JSON.stringify(items)
    }

    if (toolName === 'fetch_social_sentiment') {
      const subreddits = toolInput.subreddits as string[] | undefined
      const ticker = toolInput.ticker as string | undefined

      const [redditResult, trendingResult, streamResult] = await Promise.allSettled([
        process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET
          ? fetchRedditPosts(subreddits)
          : Promise.reject(new Error('Reddit credentials not set')),
        fetchTrendingSymbols(),
        ticker ? fetchSymbolStream(ticker) : Promise.resolve(null),
      ])

      return JSON.stringify({
        reddit: redditResult.status === 'fulfilled'
          ? redditResult.value
          : { error: (redditResult.reason as Error).message },
        stocktwits: {
          trending: trendingResult.status === 'fulfilled' ? trendingResult.value : [],
          ...(ticker && streamResult.status === 'fulfilled' && streamResult.value
            ? { [ticker]: streamResult.value }
            : {}),
        },
      })
    }

    return JSON.stringify({ error: `Unknown tool: ${toolName}` })
  } catch (err) {
    return JSON.stringify({ error: String(err) })
  }
}
