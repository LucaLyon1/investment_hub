'use client'

import { useState, useTransition } from 'react'
import { addFeed, deleteFeed } from '@/app/actions/feeds'
import type { RssFeed } from '@/lib/db/schema'
import { Button } from '@/components/ui/Button'

export function FeedManager({ feeds }: { feeds: RssFeed[] }) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    const trimmedUrl = url.trim()
    const trimmedName = name.trim()
    if (!trimmedUrl || !trimmedName) {
      setError('Both name and URL are required.')
      return
    }
    try {
      new URL(trimmedUrl)
    } catch {
      setError('Invalid URL.')
      return
    }
    setError('')
    startTransition(async () => {
      await addFeed(trimmedUrl, trimmedName)
      setUrl('')
      setName('')
    })
  }

  function handleDelete(id: string) {
    startTransition(() => deleteFeed(id))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Reuters"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-colors"
          />
          <input
            type="url"
            placeholder="https://feeds.example.com/rss"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-2 min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-colors"
          />
          <Button onClick={handleAdd} loading={isPending} variant="primary">
            Add
          </Button>
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>

      {feeds.length === 0 ? (
        <p className="text-sm text-zinc-400 italic">No feeds yet. Add one above.</p>
      ) : (
        <ul className="space-y-2">
          {feeds.map((feed) => (
            <li
              key={feed.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">{feed.name}</p>
                <p className="text-xs text-zinc-400 truncate">{feed.url}</p>
              </div>
              <button
                onClick={() => handleDelete(feed.id)}
                disabled={isPending}
                className="shrink-0 text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
