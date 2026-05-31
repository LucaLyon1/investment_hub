export const dynamic = 'force-dynamic'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ManualRecapButton } from '@/components/settings/ManualRecapButton'
import { ManualBriefButton } from '@/components/settings/ManualBriefButton'

export default function SettingsPage() {
  const telegramConfigured = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  const anthropicConfigured = !!process.env.ANTHROPIC_API_KEY

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-600 mt-1">Configuration status and manual actions.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Integration Status</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <StatusRow label="Claude API (Anthropic)" ok={anthropicConfigured} />
            <StatusRow label="Telegram Bot" ok={telegramConfigured} hint="Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Morning Brief</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600 mb-4">
            Runs at 8:00 AM on weekdays. Sends StockTwits trending tickers + sentiment and the latest RSS headlines to Telegram. No AI call — fast and cheap.
          </p>
          <ManualBriefButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Evening Recap</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600 mb-4">
            Runs at 9:00 PM on weekdays. Full AI analysis of your portfolio and market with RSS headlines.
          </p>
          <ManualRecapButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">VPS Cron Setup</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600 mb-3">Add both lines to your VPS crontab (<code className="bg-zinc-100 px-1 rounded">crontab -e</code>):</p>
          <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 text-xs overflow-x-auto">
{`# Morning brief — 8:00 AM weekdays
0 8  * * 1-5  curl -s -X POST https://your-domain.com/api/cron/morning-brief \\
              -H "Authorization: Bearer $CRON_SECRET"

# Evening recap — 9:00 PM weekdays
0 21 * * 1-5  curl -s -X POST https://your-domain.com/api/cron/morning-recap \\
              -H "Authorization: Bearer $CRON_SECRET"`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusRow({ label, ok, hint }: { label: string; ok: boolean; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 w-4 h-4 rounded-full shrink-0 ${ok ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
      <div>
        <p className="text-sm font-medium text-zinc-900">{label}</p>
        {!ok && hint && <p className="text-xs text-zinc-600 mt-0.5">{hint}</p>}
      </div>
    </div>
  )
}
