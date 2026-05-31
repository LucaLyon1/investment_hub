'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export function ManualRecapButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function trigger() {
    setStatus('loading')
    try {
      const res = await fetch('/api/cron/morning-recap', {
        method: 'POST',
        headers: { Authorization: `Bearer ${prompt('Enter CRON_SECRET:') ?? ''}` },
      })
      if (res.ok) {
        setStatus('ok')
        setMessage('Recap sent successfully! Check Telegram and email.')
      } else {
        const body = await res.json()
        setStatus('error')
        setMessage(body.error ?? 'Failed to send recap.')
      }
    } catch (err) {
      setStatus('error')
      setMessage(String(err))
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={trigger} loading={status === 'loading'} variant="secondary">
        Send Manual Recap
      </Button>
      {message && (
        <span className={`text-sm ${status === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
