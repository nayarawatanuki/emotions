import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { takeActivationToken } from '../src/features/auth/activation-token.ts'
import { passwordError } from '../src/features/auth/password-policy.ts'
import {
  parseSession,
  login,
  activateAccount,
  logout,
  loadSession
} from '../src/features/auth/auth-api.ts'
import { ApiError, apiRequest, requestError } from '../src/services/api.ts'

const session = {
  user: {
    id: 'synthetic-account',
    name: 'Pessoa de teste',
    role: 'professional'
  },
  csrfToken: randomBytes(32).toString('base64url'),
  expiresAt: '2026-11-10T20:00:00Z',
  idleExpiresAt: '2026-11-10T12:30:00Z'
}

for (const token of Array.from({ length: 16 }, () =>
  randomBytes(32).toString('base64url')
)) {
  test('reads canonical invitation and removes fragment before router mount', () => {
    const calls: unknown[][] = []
    const location = {
      pathname: '/activate-account',
      search: '?source=manual',
      hash: '#token=' + token
    }
    const history = {
      state: { keep: true },
      replaceState: (...args: unknown[]) => calls.push(args)
    }
    assert.equal(takeActivationToken(location, history), token)
    assert.deepEqual(calls, [
      [history.state, '', '/activate-account?source=manual']
    ])
  })
}
for (const hash of [
  '',
  '#token=short',
  '#token=' + 'A'.repeat(42) + 'B',
  '#token=' + 'A'.repeat(43) + '&extra=1',
  '#token=%41'.repeat(43),
  '#token=' + 'A'.repeat(44)
]) {
  test('rejects invalid/ambiguous invitation and still removes fragment', () => {
    let cleared = false
    assert.equal(
      takeActivationToken(
        { pathname: '/activate-account', search: '', hash },
        {
          state: null,
          replaceState: () => {
            cleared = true
          }
        }
      ),
      null
    )
    assert.equal(cleared, true)
  })
}
test('leaves unrelated page anchors alone', () => {
  assert.equal(
    takeActivationToken(
      { pathname: '/', search: '', hash: '#sobre' },
      { state: null, replaceState: () => assert.fail('must not rewrite') }
    ),
    null
  )
})
test('password policy counts Unicode code points and preserves spaces', () => {
  assert.equal(passwordError('🎀'.repeat(15)), null)
  assert.equal(passwordError(' '.repeat(15)), null)
  assert.equal(passwordError('a'.repeat(128)), null)
  assert.ok(passwordError('a'.repeat(14)))
  assert.ok(passwordError('a'.repeat(129)))
  assert.ok(passwordError('a'.repeat(15) + '\ud800'))
})
test('session response accepts only known role and valid expiry/CSRF shapes', () => {
  assert.deepEqual(parseSession(session), session)
  for (const invalid of [
    null,
    {},
    { ...session, user: { ...session.user, role: 'owner' } },
    { ...session, csrfToken: 'invalid' },
    { ...session, expiresAt: 'invalid' }
  ]) {
    assert.throws(() => parseSession(invalid), ApiError)
  }
})
test('transport sends cookies, JSON and CSRF safely and validates successful session responses', async () => {
  const original = globalThis.fetch
  const calls: { path: string; options: RequestInit }[] = []
  globalThis.fetch = async (path, options) => {
    calls.push({ path: String(path), options: options! })
    return String(path).endsWith('/login') || String(path).endsWith('/session')
      ? Response.json(session)
      : new Response(null, { status: 204 })
  }
  try {
    await login('synthetic', 'unchanged password 🎀')
    await activateAccount('A'.repeat(43), 'unchanged password 🎀')
    await logout(session.csrfToken)
    await loadSession(new AbortController().signal)
    assert.deepEqual(
      calls.map((call) => call.path),
      [
        '/api/auth/login',
        '/api/auth/activate',
        '/api/auth/logout',
        '/api/auth/session'
      ]
    )
    for (const { options } of calls) {
      assert.equal(options.credentials, 'same-origin')
      assert.equal(options.cache, 'no-store')
      assert.equal(options.redirect, 'error')
      assert.equal(options.referrerPolicy, 'no-referrer')
      assert.ok(options.signal)
    }
    assert.equal(
      calls[0].options.body,
      JSON.stringify({
        username: 'synthetic',
        password: 'unchanged password 🎀'
      })
    )
    assert.equal(
      (calls[2].options.headers as Record<string, string>)['X-CSRF-Token'],
      session.csrfToken
    )
    assert.equal(
      (calls[1].options.headers as Record<string, string>)[
        'X-Emotions-Request'
      ],
      '1'
    )
    assert.equal(calls[3].options.method, 'GET')
  } finally {
    globalThis.fetch = original
  }
})
test('transport never exposes server exception bodies and honors bounded Retry-After', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () =>
    new Response('private server details', {
      status: 429,
      headers: { 'Retry-After': '125' }
    })
  try {
    await assert.rejects(
      apiRequest('/auth/login', { body: {} }),
      (failure: unknown) => {
        assert.ok(failure instanceof ApiError)
        assert.equal(failure.retryAfter, 125)
        assert.ok(!failure.message.includes('private'))
        assert.match(requestError(failure), /3 minuto/)
        return true
      }
    )
  } finally {
    globalThis.fetch = original
  }
})
test('rejects HTML fallback returned instead of API JSON', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () =>
    new Response('<html>SPA</html>', {
      headers: { 'Content-Type': 'text/html' }
    })
  try {
    await assert.rejects(apiRequest('/auth/session'), ApiError)
  } finally {
    globalThis.fetch = original
  }
})
