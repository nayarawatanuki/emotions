import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { ApiError } from '../src/services/api.ts'
import {
  parseDirectory,
  parseInvitation,
  parseProfessional,
  createProfessional,
  reissueInvitation,
  loadProfessionals
} from '../src/features/professionals/professionals-api.ts'
import { professionalInputError } from '../src/features/professionals/professional-input.ts'

const origin = 'http://127.0.0.1:5174'
const item = {
  id: randomUUID(),
  accountId: randomUUID(),
  name: 'Synthetic professional',
  username: 'synthetic',
  status: 'pending',
  archived: false
}
const invitation = {
  url: origin + '/activate-account#token=' + 'A'.repeat(43),
  expiresAt: new Date(Date.now() + 86_400_000).toISOString()
}

test('directory accepts bounded pages and rejects malformed identifiers, states and cursors', () => {
  assert.deepEqual(parseDirectory({ items: [item], nextCursor: null }), {
    items: [item],
    nextCursor: null
  })
  for (const value of [
    { items: Array(26).fill(item), nextCursor: null },
    { items: [item, item], nextCursor: null },
    { items: [item], nextCursor: item.id },
    { items: [{ ...item, status: 'administrator' }], nextCursor: null },
    { items: [item], nextCursor: 'bad' },
    null
  ])
    assert.throws(() => parseDirectory(value), ApiError)
  assert.throws(
    () => parseProfessional({ ...item, id: '../auth/logout' }),
    ApiError
  )
})
test('invitation accepts only the configured same origin, exact path and canonical secret', () => {
  assert.deepEqual(parseInvitation(invitation, origin), invitation)
  for (const url of [
    'https://untrusted.example/activate-account#token=' + 'A'.repeat(43),
    origin + '/activate-account?token=' + 'A'.repeat(43),
    origin + '/activate-account#token=' + 'A'.repeat(42) + 'B',
    origin + '/login#token=' + 'A'.repeat(43),
    'javascript:alert(1)'
  ])
    assert.throws(
      () => parseInvitation({ ...invitation, url }, origin),
      ApiError
    )
  assert.throws(
    () => parseInvitation({ ...invitation, expiresAt: 'invalid' }, origin),
    ApiError
  )
})
test('professional input agrees with Unicode, normalization and control boundaries', () => {
  assert.equal(professionalInputError(' Nome 🎀 ', ' USUARIO '), null)
  assert.equal(professionalInputError('🎀'.repeat(255), 'a'.repeat(255)), null)
  for (const pair of [
    ['', 'name'],
    ['name', ' '],
    ['a\nb', 'name'],
    ['name', 'a\u0000b'],
    ['a'.repeat(256), 'name'],
    ['name', '\ud800']
  ])
    assert.ok(professionalInputError(pair[0], pair[1]))
})
test('professional client sends only allowed fields, CSRF and canonical route identifiers', async () => {
  const original = globalThis.fetch
  const calls: { path: string; options: RequestInit }[] = []
  globalThis.fetch = async (path, options) => {
    calls.push({ path: String(path), options: options! })
    return Response.json(
      options?.method === 'GET'
        ? { items: [item], nextCursor: null }
        : String(path).endsWith('/activation')
          ? invitation
          : { professional: item, activation: invitation }
    )
  }
  try {
    await createProfessional(
      { name: 'Synthetic', username: 'synthetic' },
      'csrf-fixture',
      origin
    )
    await reissueInvitation(item.id, 'csrf-fixture', origin)
    await loadProfessionals(null, new AbortController().signal)
    assert.equal(calls[0].path, '/api/professionals')
    assert.equal(
      calls[0].options.body,
      JSON.stringify({ name: 'Synthetic', username: 'synthetic' })
    )
    assert.equal(
      (calls[0].options.headers as Record<string, string>)['X-CSRF-Token'],
      'csrf-fixture'
    )
    assert.equal(calls[1].path, `/api/professionals/${item.id}/activation`)
    assert.equal(calls[1].options.body, '{}')
    await assert.rejects(
      reissueInvitation('../auth/logout', 'csrf', origin),
      ApiError
    )
    assert.equal(calls.length, 3)
  } finally {
    globalThis.fetch = original
  }
})
