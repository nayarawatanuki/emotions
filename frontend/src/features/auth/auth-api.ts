import { apiRequest, ApiError } from '../../services/api.ts'

export interface AdultSession {
  user: { id: string; name: string; role: 'administrator' | 'professional' }
  csrfToken: string
  expiresAt: string
  idleExpiresAt: string
}

export function parseSession(value: unknown): AdultSession {
  if (
    !value ||
    typeof value !== 'object' ||
    !('user' in value) ||
    !value.user ||
    typeof value.user !== 'object' ||
    !('id' in value.user) ||
    typeof value.user.id !== 'string' ||
    !('name' in value.user) ||
    typeof value.user.name !== 'string' ||
    !('role' in value.user) ||
    !['administrator', 'professional'].includes(String(value.user.role)) ||
    !('csrfToken' in value) ||
    typeof value.csrfToken !== 'string' ||
    !/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(value.csrfToken) ||
    !('expiresAt' in value) ||
    typeof value.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(value.expiresAt)) ||
    !('idleExpiresAt' in value) ||
    typeof value.idleExpiresAt !== 'string' ||
    !Number.isFinite(Date.parse(value.idleExpiresAt))
  ) {
    throw new ApiError(502)
  }
  return value as AdultSession
}

export async function login(username: string, password: string): Promise<void> {
  parseSession(
    await apiRequest('/auth/login', { body: { username, password } })
  )
}

export async function loadSession(signal: AbortSignal): Promise<AdultSession> {
  return parseSession(await apiRequest('/auth/session', { signal }))
}

export async function logout(csrfToken: string): Promise<void> {
  await apiRequest('/auth/logout', { body: {}, csrfToken })
}

export async function activateAccount(
  token: string,
  password: string
): Promise<void> {
  await apiRequest('/auth/activate', { body: { token, password } })
}
