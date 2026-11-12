import { apiRequest, ApiError } from '../../services/api.ts'

export interface ProfessionalSummary {
  id: string
  accountId: string
  name: string
  username: string
  status: 'pending' | 'active' | 'suspended'
  archived: boolean
}
export interface ActivationInvitation {
  url: string
  expiresAt: string
}
export interface ProfessionalInvitation {
  professional: ProfessionalSummary
  activation: ActivationInvitation
}
export interface DirectoryPage {
  items: ProfessionalSummary[]
  nextCursor: string | null
}
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export function parseProfessional(value: unknown): ProfessionalSummary {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    !uuid.test(value.id) ||
    typeof value.accountId !== 'string' ||
    !uuid.test(value.accountId) ||
    typeof value.name !== 'string' ||
    typeof value.username !== 'string' ||
    !['pending', 'active', 'suspended'].includes(String(value.status)) ||
    typeof value.archived !== 'boolean'
  )
    throw new ApiError(502)
  return {
    id: value.id,
    accountId: value.accountId,
    name: value.name,
    username: value.username,
    status: value.status as ProfessionalSummary['status'],
    archived: value.archived
  }
}
export function parseInvitation(
  value: unknown,
  origin: string
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
    url.search ||
    !/^#token=[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(url.hash)
  )
    throw new ApiError(502)
  return { url: value.url, expiresAt: value.expiresAt }
}
export function parseDirectory(value: unknown): DirectoryPage {
  if (
    !record(value) ||
    !Array.isArray(value.items) ||
    value.items.length > 25 ||
    !(
      value.nextCursor === null ||
      (typeof value.nextCursor === 'string' && uuid.test(value.nextCursor))
    )
  )
    throw new ApiError(502)
  const items = value.items.map(parseProfessional)
  if (
    new Set(items.map((item) => item.id)).size !== items.length ||
    (value.nextCursor !== null &&
      (items.length !== 25 || value.nextCursor !== items.at(-1)?.id))
  )
    throw new ApiError(502)
  return { items, nextCursor: value.nextCursor as string | null }
}
export async function loadProfessionals(
  after: string | null,
  signal: AbortSignal
): Promise<DirectoryPage> {
  if (after !== null && !uuid.test(after)) throw new ApiError(400)
  return parseDirectory(
    await apiRequest(
      '/professionals' + (after ? '?after=' + encodeURIComponent(after) : ''),
      { signal }
    )
  )
}
export async function createProfessional(
  input: { name: string; username: string },
  csrfToken: string,
  origin: string
): Promise<ProfessionalInvitation> {
  const result = await apiRequest('/professionals', { body: input, csrfToken })
  if (
    !record(result) ||
    !record(result.professional) ||
    result.professional.status !== 'pending'
  )
    throw new ApiError(502)
  return {
    professional: parseProfessional({
      ...result.professional,
      archived: false
    }),
    activation: parseInvitation(result.activation, origin)
  }
}
export async function reissueInvitation(
  id: string,
  csrfToken: string,
  origin: string
): Promise<ActivationInvitation> {
  if (!uuid.test(id)) throw new ApiError(400)
  return parseInvitation(
    await apiRequest(`/professionals/${id}/activation`, {
      body: {},
      csrfToken
    }),
    origin
  )
}
