/**
 * apiClient.ts — Centralized authenticated fetch utility for the Solidus frontend.
 *
 * Supports two authentication modes:
 *   1. Cookie mode  — httpOnly JWT cookies set by Google OAuth / login endpoints.
 *      The browser sends solidus_access automatically; no manual token handling.
 *   2. Header mode  — Bearer token from localStorage (legacy / fallback).
 *
 * Every call automatically:
 *  1. Sends credentials (cookies) with every request
 *  2. On 401 → tries to refresh once via /api/auth/refresh (using cookie)
 *  3. On refresh failure → clears auth state and redirects to /login
 */

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5050'

// ── Token helpers ──────────────────────────────────────────────
// localStorage tokens are kept for backward compatibility (email/password flow).
// Cookie-authenticated users (Google OAuth) won't have tokens in localStorage.

export const auth = {
  getAccessToken: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,

  getRefreshToken: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null,

  setTokens: (accessToken: string, refreshToken?: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('accessToken', accessToken)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
  },

  clear: () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    // Clear the route guard cookie (non-httpOnly — JS can write it)
    document.cookie = 'solidus_authed=; path=/; max-age=0; SameSite=Lax'
    // Note: solidus_access + solidus_refresh are httpOnly — cleared by the
    // backend /api/auth/logout endpoint, not by JS.
  },

  /**
   * Returns true if the user is authenticated via either:
   *  - solidus_authed cookie (set by both email/password and Google OAuth login)
   *  - localStorage accessToken (legacy fallback)
   */
  isLoggedIn: (): boolean => {
    if (typeof window === 'undefined') return false
    const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('solidus_authed=true'))
    return hasCookie || !!localStorage.getItem('accessToken')
  },
}

// ── Silent token refresh ────────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      // Send with credentials — the solidus_refresh httpOnly cookie is included automatically
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        // Also send localStorage refresh token as fallback for email/password users
        body: JSON.stringify({
          refreshToken: typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : undefined,
        }),
      })
      const data = await res.json()
      if (data.success && data.data?.accessToken) {
        // Update localStorage for email/password users; cookie users are handled server-side
        if (typeof window !== 'undefined') localStorage.setItem('accessToken', data.data.accessToken)
        return data.data.accessToken
      }
    } catch {
      // network error during refresh
    }
    return null
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

// ── Core fetch wrapper ─────────────────────────────────────────

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, headers: customHeaders = {}, ...rest } = options

  const token = auth.getAccessToken()

  const makeHeaders = (t: string | null): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(t && !skipAuth ? { Authorization: `Bearer ${t}` } : {}),
    ...(customHeaders as Record<string, string>),
  })

  const doFetch = (t: string | null) =>
    fetch(`${BASE}${path}`, {
      headers:     makeHeaders(t),
      credentials: 'include', // always send cookies (solidus_access httpOnly cookie)
      ...rest,
    })

  // First attempt
  let res = await doFetch(token)

  // 401 or 403 → try refresh once (backend uses 403 for expired tokens)
  if ((res.status === 401 || res.status === 403) && !skipAuth) {
    const newToken = await tryRefresh()
    if (newToken) {
      res = await doFetch(newToken)
    } else {
      auth.clear()
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Session expired. Please log in again.')
    }
  }

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`)
  }

  return data as T
}

// ── Typed convenience methods ──────────────────────────────────

export const api = {
  get:    <T>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { method: 'GET', ...opts }),

  post:   <T>(path: string, body: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body), ...opts }),

  put:    <T>(path: string, body: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body), ...opts }),

  delete: <T>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { method: 'DELETE', ...opts }),
}

// ── Blob download (binary files like PDF/Excel) ────────────────
// Mirrors apiFetch auth logic (Bearer + cookies + auto-refresh)
// but returns the raw Response so callers can stream .blob()

export async function apiFetchBlob(path: string): Promise<Response> {
  const token = auth.getAccessToken()

  const doFetch = (t: string | null) =>
    fetch(`${BASE}${path}`, {
      headers: {
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      credentials: 'include',
    })

  let res = await doFetch(token)

  // 401/403 → try refresh once
  if (res.status === 401 || res.status === 403) {
    const newToken = await tryRefresh()
    if (newToken) {
      res = await doFetch(newToken)
    } else {
      auth.clear()
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Session expired. Please log in again.')
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Export failed' }))
    throw new Error(err.message ?? `Request failed with status ${res.status}`)
  }

  return res
}

// ── Response type ──────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
}
