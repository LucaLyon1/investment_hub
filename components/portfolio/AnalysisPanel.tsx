'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

export function AnalysisPanel() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function analyze() {
    if (loading) {
      abortRef.current?.abort()
      setLoading(false)
      return
    }

    setText('')
    setLoading(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/ai/analyze', { method: 'POST', signal: ctrl.signal })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) setText((prev) => prev + parsed.text)
          } catch {}
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setText((prev) => prev + '\n\n_Analysis error. Please try again._')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">AI Portfolio Analysis</h2>
          <Button variant={loading ? 'secondary' : 'primary'} size="sm" onClick={analyze}>
            {loading ? '⏹ Stop' : '✦ Analyze'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {text ? (
          <div className="prose prose-sm max-w-none text-zinc-700 whitespace-pre-wrap text-sm leading-relaxed">
            {text}
            {loading && <span className="inline-block w-1 h-4 bg-indigo-500 animate-pulse ml-1 align-middle" />}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">
            Click Analyze to get a real-time AI assessment of your portfolio.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
