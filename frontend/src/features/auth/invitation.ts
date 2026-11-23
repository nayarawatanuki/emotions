import { ApiError } from '../../services/api.ts'

export interface ActivationInvitation {
  url: string
  expiresAt: string
}
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export function parseInvitation(
  value: unknown,
  origin: string,
  profile: 'professional' | 'child' = 'professional'
): ActivationInvitation {
  if (
    !record(value) ||
    typeof value.url !== 'string' ||
    typeof value.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(value.expiresAt))
  )
    throw new ApiError(502)
  let url: URL
  try {
    url = new URL(value.url)
  } catch {
    throw new ApiError(502)
  }
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    url.pathname !== '/activate-account' ||
    url.search !== (profile === 'child' ? '?profile=child' : '') ||
    !/^#token=[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(url.hash)
  )
    throw new ApiError(502)
  return { url: value.url, expiresAt: value.expiresAt }
}
