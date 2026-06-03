import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createHash } from 'crypto'

const COOKIE_NAME = 'auth'

function expectedToken(): string {
  return createHash('sha256').update(process.env.DASHBOARD_PASSWORD ?? '').digest('hex')
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/telegram') ||
    pathname.startsWith('/api/cron')
  ) {
    return NextResponse.next()
  }

  if (request.cookies.get(COOKIE_NAME)?.value !== expectedToken()) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
