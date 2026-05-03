import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Route guard — redirects unauthenticated users away from protected pages.
 *
 * Protected paths: /dashboard, /hub, /terminal
 * We check for the accessToken cookie OR we let the client-side handle it
 * (since tokens are in localStorage, we can only do a soft guard here).
 *
 * NOTE: localStorage is not accessible in Next.js middleware (edge runtime).
 * We therefore use a `solidus_authed` cookie that gets set by AuthFlow after login.
 * If the cookie is absent the user is redirected to /login.
 */

const PROTECTED = ['/dashboard', '/hub', '/terminal', '/reports']

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl
    const isProtected = PROTECTED.some(p => pathname.startsWith(p))

    if (!isProtected) return NextResponse.next()

    const authed = req.cookies.get('solidus_authed')?.value === 'true'
    if (!authed) {
        const loginUrl = req.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.searchParams.set('from', pathname)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*', '/hub/:path*', '/terminal/:path*', '/reports/:path*'],
}
