export interface RedditPost {
  subreddit: string
  title: string
  body: string
  score: number
  comments: number
  upvoteRatio: number
}

const DEFAULT_SUBS = ['wallstreetbets', 'investing', 'stocks']

// In-memory token cache — valid for 1 hour, reused across requests within the process
let tokenCache: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.value
  }
  const clientId = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in .env.local')
  }
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'InvestmentDashboard/1.0 (personal use)',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Reddit OAuth failed: ${res.status}`)
  const data = await res.json() as { access_token: string; expires_in: number }
  tokenCache = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return tokenCache.value
}

export async function fetchRedditPosts(
  subreddits: string[] = DEFAULT_SUBS,
  limitPerSub = 15
): Promise<RedditPost[]> {
  const token = await getAccessToken()
  const results = await Promise.allSettled(
    subreddits.map((sub) => fetchSubreddit(sub, limitPerSub, token))
  )
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
}

async function fetchSubreddit(sub: string, limit: number, token: string): Promise<RedditPost[]> {
  const res = await fetch(`https://oauth.reddit.com/r/${sub}/hot?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'InvestmentDashboard/1.0 (personal use)',
    },
  })
  if (!res.ok) throw new Error(`Reddit r/${sub}: ${res.status}`)
  const data = await res.json() as { data: { children: { data: Record<string, unknown> }[] } }
  return data.data.children
    .filter((c) => !c.data.stickied)
    .map((c) => ({
      subreddit: sub,
      title: c.data.title as string,
      body: ((c.data.selftext as string) ?? '').slice(0, 500),
      score: c.data.score as number,
      comments: c.data.num_comments as number,
      upvoteRatio: c.data.upvote_ratio as number,
    }))
}
