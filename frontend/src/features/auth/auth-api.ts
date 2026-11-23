import { apiRequest, ApiError } from '../../services/api.ts'

type AdultRole = 'administrator' | 'professional'
type SessionRole = AdultRole | 'child'

interface Session<Role extends SessionRole> {
  user: { id: string; name: string; role: Role }
  csrfToken: string
  expiresAt: string
  idleExpiresAt: string
}

export type AdultSession = Session<AdultRole>
export type ChildSession = Session<'child'>

function parseRoleSession<Role extends SessionRole>(value: unknown, roles: readonly Role[]): Session<Role> {
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
    typeof value.user.role !== 'string' ||
    !roles.includes(value.user.role as Role) ||
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
  return value as Session<Role>
}

export function parseSession(value: unknown): AdultSession {
  return parseRoleSession(value, ['administrator', 'professional'])
}

export async function login(username: string, password: string, child = false): Promise<void> {
  const result = await apiRequest(child ? '/auth/child/login' : '/auth/login', { body: { username, password } })
  if (child) parseRoleSession(result, ['child'])
  else parseSession(result)
}

export async function loadChildSession(signal: AbortSignal): Promise<ChildSession> {
  return parseRoleSession(await apiRequest('/auth/child/session', { signal }), ['child'])
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
