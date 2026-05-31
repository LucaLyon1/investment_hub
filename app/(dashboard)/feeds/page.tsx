export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { rssFeeds } from '@/lib/db/schema'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { FeedManager } from '@/components/feeds/FeedManager'

export default async function FeedsPage() {
  const feeds = await db.select().from(rssFeeds).orderBy(rssFeeds.createdAt)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">RSS Feeds</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Subscribe to financial news feeds. Claude will read them during the evening recap and when generating ideas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Subscriptions</h2>
        </CardHeader>
        <CardContent>
          <FeedManager feeds={feeds} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Suggested feeds</h2>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-zinc-600">
            <li><span className="font-medium text-zinc-800">Reuters Business</span> — <code className="text-xs bg-zinc-100 px-1 rounded">https://feeds.reuters.com/reuters/businessNews</code></li>
            <li><span className="font-medium text-zinc-800">CNBC Top News</span> — <code className="text-xs bg-zinc-100 px-1 rounded">https://feeds.nbcnews.com/nbcnews/public/business</code></li>
            <li><span className="font-medium text-zinc-800">FT Markets</span> — <code className="text-xs bg-zinc-100 px-1 rounded">https://www.ft.com/markets?format=rss</code></li>
            <li><span className="font-medium text-zinc-800">Seeking Alpha</span> — <code className="text-xs bg-zinc-100 px-1 rounded">https://seekingalpha.com/feed.xml</code></li>
            <li><span className="font-medium text-zinc-800">Yahoo Finance</span> — <code className="text-xs bg-zinc-100 px-1 rounded">https://finance.yahoo.com/news/rss</code></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
