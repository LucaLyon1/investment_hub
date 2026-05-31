'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export function IdeaGenerateButton() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function generate() {
    setLoading(true)
    setMessage('Agent is analyzing market data…')
    try {
      await fetch('/api/ai/ideas', { method: 'POST' })
      setMessage('Ideas are being generated. Refreshing in 30s…')
      setTimeout(() => {
        router.refresh()
        setMessage('')
        setLoading(false)
      }, 30000)
    } catch {
      setMessage('Failed to start generation.')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={generate} loading={loading} disabled={loading}>
        ✦ Generate Ideas
      </Button>
      {message && <span className="text-sm text-zinc-700">{message}</span>}
    </div>
  )
}
