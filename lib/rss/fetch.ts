import { db } from '@/lib/db'
import { rssFeeds } from '@/lib/db/schema'

export interface RssItem {
  title: string
  link: string
  summary: string
  pubDate: string
  source: string
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'))
  return match?.[1]?.trim() ?? ''
}

function extractAtomLink(block: string): string {
  const match = block.match(/<link[^>]+href=["']([^"']+)["']/)
  return match?.[1] ?? ''
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300)
}

function parseXml(xml: string, sourceName: string, maxItems: number): RssItem[] {
  const isAtom = /<feed[\s>]/.test(xml)
  const itemTag = isAtom ? 'entry' : 'item'
  const itemRegex = new RegExp(`<${itemTag}[\\s>]([\\s\\S]*?)<\\/${itemTag}>`, 'g')
  const items: RssItem[] = []

  let match
  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1]
    const link = isAtom
      ? (extractAtomLink(block) || extractTag(block, 'id'))
      : extractTag(block, 'link') || extractAtomLink(block)

    items.push({
      title: extractTag(block, 'title'),
      link,
      summary: stripHtml(extractTag(block, isAtom ? 'summary' : 'description')),
      pubDate: extractTag(block, isAtom ? 'updated' : 'pubDate'),
      source: sourceName,
    })
  }

  return items
}

export async function fetchFeedItems(url: string, name: string, maxItems = 8): Promise<RssItem[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'InvestmentDashboard/1.0' },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Failed to fetch feed ${name}: ${res.status}`)
  const xml = await res.text()
  return parseXml(xml, name, maxItems)
}

export async function fetchAllFeeds(maxItemsPerFeed = 5): Promise<RssItem[]> {
  const feeds = await db.select().from(rssFeeds)
  if (feeds.length === 0) return []

  const results = await Promise.allSettled(
    feeds.map((f) => fetchFeedItems(f.url, f.name, maxItemsPerFeed))
  )

  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
}
