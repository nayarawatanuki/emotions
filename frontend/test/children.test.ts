import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { ApiError } from '../src/services/api.ts'
import {
  createChild,
  setChildArchived,
  updateChild,
  loadChild,
  loadChildren,
  parseChild,
  parseChildSummary,
  isCivilDate,
  formatCivilDate
} from '../src/features/children/children-api.ts'
import { childInputError } from '../src/features/children/child-input.ts'
const input = {
  name: 'Synthetic child',
  username: 'synthetic-child',
  dateOfBirth: '2020-02-29',
  guardianName: 'Synthetic guardian',
  treatmentActive: true,
  reportedLevel: null,
  notes: 'Line one\nLine two'
}
const view = {
  ...input,
  id: randomUUID(),
  archived: false,
  revision: 'a'.repeat(64)
}
test('civil dates preserve the day independently of device timezone', () => {
  assert.equal(isCivilDate('2020-02-29'), true)
  assert.equal(isCivilDate('2000-02-29'), true)
  for (const value of [
    '2021-02-29',
    '1900-02-29',
    '2020-02-30',
    '2020-00-01',
    '2020-13-01',
    '2020-1-01',
    '2020-01-01T00:00:00Z',
    '0001-01-01'
  ])
    assert.equal(isCivilDate(value), false)
  assert.equal(formatCivilDate('2020-02-29'), '29/02/2020')
})
test('child input checks identities, actual date, future birth and bounded notes', () => {
  assert.equal(childInputError(input, '2026-11-12'), null)
  assert.equal(
    childInputError({ ...input, notes: '🎀'.repeat(2000) }, '2026-11-12'),
    null
  )
  for (const change of [
    { name: '' },
    { guardianName: 'x\u0000y' },
    { username: '\ud800' },
    { dateOfBirth: '2026-11-13' },
    { dateOfBirth: '2021-02-29' },
    { notes: 'a'.repeat(2001) },
    { notes: 'a\u0000b' },
    { reportedLevel: 'a'.repeat(256) }
  ])
    assert.ok(childInputError({ ...input, ...change }, '2026-11-12'))
})
test('summary projects only list fields and details validate optional clinical text', () => {
  const summary = parseChildSummary(view)
  assert.deepEqual(Object.keys(summary).sort(), [
    'archived',
    'dateOfBirth',
    'id',
    'name',
    'treatmentActive',
    'username'
  ])
  assert.deepEqual(parseChild(view), view)
  for (const change of [
    { id: '../other' },
    { dateOfBirth: '2021-02-29' },
    { treatmentActive: 'true' },
    { guardianName: null },
    { notes: 3 },
    { reportedLevel: [] }
  ])
    assert.throws(() => parseChild({ ...view, ...change }), ApiError)
})
test('client uses canonical IDs, exact registration fields and CSRF; list excludes notes', async () => {
  const original = globalThis.fetch
  const calls: { path: string; options: RequestInit }[] = []
  globalThis.fetch = async (path, options) => {
    calls.push({ path: String(path), options: options! })
    return Response.json(
      String(path) === '/api/children' && options?.method === 'GET'
        ? { items: [parseChildSummary(view)], nextCursor: null }
        : view
    )
  }
  try {
    await createChild(input, 'fixture-csrf')
    await loadChild(view.id)
    const page = await loadChildren(null, new AbortController().signal)
    assert.equal(calls[0].path, '/api/children')
    assert.equal(calls[0].options.body, JSON.stringify(input))
    assert.equal(
      (calls[0].options.headers as Record<string, string>)['X-CSRF-Token'],
      'fixture-csrf'
    )
    assert.equal(calls[1].path, '/api/children/' + view.id)
    assert.equal(page.items[0].id, view.id)
    assert.equal('notes' in page.items[0], false)
    await assert.rejects(loadChild('../professionals'), ApiError)
    assert.equal(calls.length, 3)
  } finally {
    globalThis.fetch = original
  }
})
test('directory rejects duplicate/unbounded pages and inconsistent cursors', async () => {
  const original = globalThis.fetch
  try {
    for (const response of [
      { items: [view, view], nextCursor: null },
      { items: Array(26).fill(view), nextCursor: null },
      { items: [view], nextCursor: view.id },
      { items: [view], nextCursor: 'bad' }
    ]) {
      globalThis.fetch = async () => Response.json(response)
      await assert.rejects(
        loadChildren(null, new AbortController().signal),
        ApiError
      )
    }
  } finally {
    globalThis.fetch = original
  }
})

test('update preserves revision, uses PATCH/CSRF, and rejects missing version before HTTP', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async (path, options) => {
    calls++
    assert.equal(String(path), '/api/children/' + view.id)
    assert.equal(options?.method, 'PATCH')
    assert.equal(
      (options!.headers as Record<string, string>)['X-CSRF-Token'],
      'fixture-csrf'
    )
    assert.deepEqual(JSON.parse(String(options?.body)), {
      ...input,
      revision: view.revision
    })
    return Response.json(view)
  }
  try {
    await updateChild(view.id, input, view.revision, 'fixture-csrf')
    await assert.rejects(updateChild(view.id, input, 'bad', 'csrf'), ApiError)
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = original
  }
})

test('archive sends only desired state and revision with PATCH/CSRF; archived list has explicit filter', async () => {
  const original = globalThis.fetch
  const calls: { path: string; options: RequestInit }[] = []
  globalThis.fetch = async (path, options) => {
    calls.push({ path: String(path), options: options! })
    return Response.json(
      String(path).includes('?')
        ? { items: [], nextCursor: null }
        : { ...view, archived: true }
    )
  }
  try {
    assert.equal(
      (await setChildArchived(view, true, 'fixture-csrf')).archived,
      true
    )
    await loadChildren(null, new AbortController().signal, true)
    assert.equal(calls[0].path, '/api/children/' + view.id + '/archive')
    assert.equal(calls[0].options.method, 'PATCH')
    assert.deepEqual(JSON.parse(String(calls[0].options.body)), {
      archived: true,
      revision: view.revision
    })
    assert.equal(
      (calls[0].options.headers as Record<string, string>)['X-CSRF-Token'],
      'fixture-csrf'
    )
    assert.equal(calls[1].path, '/api/children?archived=true')
    await assert.rejects(
      setChildArchived({ ...view, revision: 'bad' }, true, 'csrf'),
      ApiError
    )
    assert.equal(calls.length, 2)
  } finally {
    globalThis.fetch = original
  }
})
