export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { watchlist } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { WatchlistTable } from '@/components/watchlist/WatchlistTable'

export default async function WatchlistPage() {
  const items = await db.select().from(watchlist).orderBy(desc(watchlist.addedAt))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Watchlist</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Tickers extracted from messages you send to your Telegram bot. Send any text or image — Claude will find the tickers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Tickers</h2>
            <span className="text-xs text-zinc-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>
        </CardHeader>
        <CardContent>
          <WatchlistTable items={items} />
        </CardContent>
      </Card>
    </div>
  )
}
