import { ApiError, apiRequest } from '../../services/api.ts'
export interface ChildSummary {
  id: string
  name: string
  username: string
  dateOfBirth: string
  treatmentActive: boolean
  archived: boolean
}
export interface ChildView extends ChildSummary {
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
    typeof value.guardianName !== 'string' ||
    !(
      value.reportedLevel === null || typeof value.reportedLevel === 'string'
    ) ||
    !(value.notes === null || typeof value.notes === 'string')
  )
    throw new ApiError(502)
  return {
    ...identity,
    guardianName: value.guardianName,
    reportedLevel: value.reportedLevel,
    notes: value.notes
  }
}
export async function loadChildren(
  after: string | null,
  signal: AbortSignal
): Promise<ChildPage> {
  if (after !== null && !uuid.test(after)) throw new ApiError(400)
  const result = await apiRequest(
    '/children' + (after ? '?after=' + encodeURIComponent(after) : ''),
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
