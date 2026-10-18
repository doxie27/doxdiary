/**
 * Schlanker API-Client für die PHP-REST-API.
 * - Session-Cookie (HttpOnly) wird vom Browser verwaltet
 * - CSRF-Token wird bei Bedarf geholt und bei 419 einmalig erneuert
 * - Fehler kommen einheitlich als ApiError mit deutscher Meldung
 */

export const API_BASE: string = import.meta.env.VITE_API_URL ?? `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/v1`

export class ApiError extends Error {
  status: number
  code: string
  fields: Record<string, string>

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

let csrfToken: string | null = null

export function setCsrfToken(token: string | undefined | null) {
  if (token) csrfToken = token
}

async function refreshCsrf() {
  const res = await send('GET', '/auth/csrf')
  setCsrfToken((res as { csrfToken: string }).csrfToken)
}

type Body = Record<string, unknown> | FormData | undefined

async function send(method: string, path: string, body?: Body): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(API_BASE + path, {
      method,
      credentials: 'same-origin',
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'network', 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.')
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = (data as { error?: { code: string; message: string; fields?: Record<string, string> } } | null)?.error
    throw new ApiError(res.status, err?.code ?? 'server_error', err?.message ?? 'Ein unerwarteter Fehler ist aufgetreten.', err?.fields ?? {})
  }
  setCsrfToken((data as { csrfToken?: string } | null)?.csrfToken)
  return data
}

/** Für Datei-Downloads (z. B. Backup): liefert Blob statt JSON. */
export async function apiBlob(path: string, body: Record<string, unknown>): Promise<Blob> {
  if (!csrfToken) await refreshCsrf()
  let res: Response
  try {
    res = await fetch(API_BASE + path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken ?? '' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'network', 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.')
  }
  if (!res.ok) {
    const err = ((await res.json().catch(() => null)) as { error?: { code: string; message: string; fields?: Record<string, string> } } | null)?.error
    throw new ApiError(res.status, err?.code ?? 'server_error', err?.message ?? 'Download fehlgeschlagen.', err?.fields ?? {})
  }
  return res.blob()
}

export async function api<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: Body): Promise<T> {
  if (method !== 'GET' && !csrfToken) await refreshCsrf()
  try {
    return (await send(method, path, body)) as T
  } catch (e) {
    // Token abgelaufen (z. B. neue Session) → einmal neu holen und wiederholen
    if (e instanceof ApiError && e.status === 419) {
      await refreshCsrf()
      return (await send(method, path, body)) as T
    }
    throw e
  }
}
