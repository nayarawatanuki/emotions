import { parseInvitation } from '../auth/invitation.ts'
import { ApiError, apiRequest, apiResponse, readJsonResponse } from '../../services/api.ts'
export interface ChildSummary {
  id: string
  name: string
  username: string
  dateOfBirth: string
  treatmentActive: boolean
  archived: boolean
}
export interface ChildView extends ChildSummary {
  revision: string
  guardianName: string
  reportedLevel: string | null
  notes: string | null
}
export interface CreateChildInput {
  name: string
  username: string
  dateOfBirth: string
  guardianName: string
  treatmentActive: boolean
  reportedLevel: string | null
  notes: string | null
}
export interface ChildPage {
  items: ChildSummary[]
  nextCursor: string | null
}
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
export function isCivilDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value))
    return false
  const date = new Date(value + 'T00:00:00Z')
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}
export function parseChildSummary(value: unknown): ChildSummary {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    !uuid.test(value.id) ||
    typeof value.name !== 'string' ||
    typeof value.username !== 'string' ||
    !isCivilDate(value.dateOfBirth) ||
    typeof value.treatmentActive !== 'boolean' ||
    typeof value.archived !== 'boolean'
  )
    throw new ApiError(502)
  return {
    id: value.id,
    name: value.name,
    username: value.username,
    dateOfBirth: value.dateOfBirth,
    treatmentActive: value.treatmentActive,
    archived: value.archived
  }
}
export function parseChild(value: unknown): ChildView {
  const identity = parseChildSummary(value)
  if (
    !record(value) ||
    typeof value.revision !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.revision) ||
    typeof value.guardianName !== 'string' ||
    !(
      value.reportedLevel === null || typeof value.reportedLevel === 'string'
    ) ||
    !(value.notes === null || typeof value.notes === 'string')
  )
    throw new ApiError(502)
  return {
    ...identity,
    revision: value.revision,
    guardianName: value.guardianName,
    reportedLevel: value.reportedLevel,
    notes: value.notes
  }
}
export async function loadChildren(
  after: string | null,
  signal: AbortSignal,
  archived = false
): Promise<ChildPage> {
  if (after !== null && !uuid.test(after)) throw new ApiError(400)
  const query = new URLSearchParams()
  if (after) query.set('after', after)
  if (archived) query.set('archived', 'true')
  const result = await apiRequest(
    '/children' + (query.size ? '?' + query.toString() : ''),
    { signal }
  )
  if (
    !record(result) ||
    !Array.isArray(result.items) ||
    result.items.length > 25 ||
    !(
      result.nextCursor === null ||
      (typeof result.nextCursor === 'string' && uuid.test(result.nextCursor))
    )
  )
    throw new ApiError(502)
  const items = result.items.map(parseChildSummary)
  if (
    new Set(items.map((item) => item.id)).size !== items.length ||
    (result.nextCursor !== null &&
      (items.length !== 25 || result.nextCursor !== items.at(-1)?.id))
  )
    throw new ApiError(502)
  return { items, nextCursor: result.nextCursor as string | null }
}
export async function loadChild(id: string): Promise<ChildView> {
  if (!uuid.test(id)) throw new ApiError(400)
  return parseChild(await apiRequest('/children/' + id))
}
export async function createChild(
  input: CreateChildInput,
  csrfToken: string
): Promise<ChildView> {
  return parseChild(await apiRequest('/children', { body: input, csrfToken }))
}
export function formatCivilDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(value + 'T00:00:00Z')
  )
}

export async function updateChild(
  id: string,
  input: CreateChildInput,
  revision: string,
  csrfToken: string
): Promise<ChildView> {
  if (!uuid.test(id) || !/^[a-f0-9]{64}$/.test(revision))
    throw new ApiError(400)
  return parseChild(
    await apiRequest('/children/' + id, {
      method: 'PATCH',
      body: { ...input, revision },
      csrfToken
    })
  )
}

export async function setChildArchived(
  child: Pick<ChildView, 'id' | 'revision'>,
  archived: boolean,
  csrfToken: string
): Promise<ChildView> {
  if (!uuid.test(child.id) || !/^[a-f0-9]{64}$/.test(child.revision))
    throw new ApiError(400)
  return parseChild(
    await apiRequest('/children/' + child.id + '/archive', {
      method: 'PATCH',
      body: { archived, revision: child.revision },
      csrfToken
    })
  )
}


export const childPhotoTypes = ['image/jpeg', 'image/png', 'image/webp']
export const childPhotoMaxBytes = 5 * 1024 * 1024

function photoPath(id: string) {
  if (!uuid.test(id)) throw new ApiError(400)
  return '/children/' + id + '/photo'
}

export async function loadChildPhoto(id: string, signal: AbortSignal) {
  try {
    const response = await apiResponse(photoPath(id), {
      headers: { Accept: 'image/webp' },
      signal
    })
    if (response.headers.get('Content-Type') !== 'image/webp')
      throw new ApiError(502)
    const photo = await response.blob()
    if (!photo.size || photo.size > childPhotoMaxBytes) throw new ApiError(502)
    return photo
  } catch (failure) {
    if (failure instanceof ApiError && failure.status === 404) return null
    throw failure
  }
}

export async function uploadChildPhoto(
  child: Pick<ChildView, 'id' | 'revision'>,
  file: File,
  csrfToken: string
) {
  if (!/^[a-f0-9]{64}$/.test(child.revision) || !file.size)
    throw new ApiError(400)
  if (file.size > childPhotoMaxBytes) throw new ApiError(413)
  if (!childPhotoTypes.includes(file.type)) throw new ApiError(415)
  const response = await apiResponse(photoPath(child.id), {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': file.type,
      'If-Match': '"' + child.revision + '"',
      'X-Emotions-Request': '1',
      'X-CSRF-Token': csrfToken
    },
    body: file
  })
  return parseChild(await readJsonResponse(response))
}

export async function issueChildInvitation(id: string, csrfToken: string, origin: string) {
  if (!uuid.test(id)) throw new ApiError(400)
  return parseInvitation(await apiRequest(`/auth/children/${id}/invitation`, {
    body: {},
    csrfToken
  }), origin, 'child')
}
