// Opt-in real HTTP test. Requires compiled backend, temporary API/Vite, and empty local DB.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import {
  login,
  loadSession,
  activateAccount,
  logout
} from '../src/features/auth/auth-api.ts'
import { ApiError } from '../src/services/api.ts'
import { readDatabaseEnvironment } from '../../backend/dist/config/database-environment.js'
import { createDatabaseOptions } from '../../backend/dist/database/database-options.js'
import { AccountEntity } from '../../backend/dist/modules/accounts/entities/account.entity.js'
import { ProfessionalEntity } from '../../backend/dist/modules/professionals/entities/professional.entity.js'
import { AccountTokenEntity } from '../../backend/dist/modules/auth/entities/account-token.entity.js'
import { AuthSessionEntity } from '../../backend/dist/modules/auth/entities/auth-session.entity.js'
import { AuthRateLimitEntity } from '../../backend/dist/modules/auth/entities/auth-rate-limit.entity.js'
import { PasswordService } from '../../backend/dist/modules/auth/services/password.service.js'
import {
  createOpaqueToken,
  opaqueTokenDigest
} from '../../backend/dist/modules/auth/security/opaque-tokens.js'
import { keyedDigest } from '../../backend/dist/modules/auth/security/session-tokens.js'

const requireBackend = createRequire(
  new URL('../../backend/package.json', import.meta.url)
)
const { DataSource } = requireBackend('typeorm')

test('frontend client completes activation, login, session and logout through real Vite proxy', async () => {
  const origin = process.env.FRONTEND_TEST_ORIGIN ?? 'http://127.0.0.1:5174'
  assert.match(origin, /^http:\/\/127\.0\.0\.1:\d{4,5}$/)
  const environment = readDatabaseEnvironment(process.env)
  assert.ok(
    environment &&
      environment.database === 'emotions_development' &&
      ['localhost', '127.0.0.1', '::1'].includes(environment.host)
  )
  assert.match(process.env.AUTH_SECRET ?? '', /^[a-f0-9]{64}$/)
  const source = await new DataSource(
    createDatabaseOptions(environment)
  ).initialize()
  const adminId = randomUUID(),
    accountId = randomUUID(),
    profileId = randomUUID(),
    tokenId = randomUUID()
  const username = 'fixture_frontend_' + accountId
  const adminUsername = 'fixture_frontend_' + adminId
  const password = 'Synthetic frontend integration phrase 🎀'
  const token = createOpaqueToken()
  const manifest = join(tmpdir(), `emotions-frontend-fixture-${adminId}.json`)
  const originalFetch = globalThis.fetch
  const counterKeys = [
    {
      scope: 'login_origin',
      keyDigest: keyedDigest(process.env.AUTH_SECRET, 'login-origin-v1', [
        '127.0.0.1'
      ])
    },
    {
      scope: 'login_origin_account',
      keyDigest: keyedDigest(
        process.env.AUTH_SECRET,
        'login-origin-account-v1',
        ['127.0.0.1', username]
      )
    },
    {
      scope: 'token_redemption',
      keyDigest: keyedDigest(process.env.AUTH_SECRET, 'activation-origin-v1', [
        '127.0.0.1'
      ])
    }
  ]
  let owned = false
  let cookie = ''
  async function assertEmpty() {
    for (const metadata of source.entityMetadatas) {
      const rows = await source.query(
        `SELECT COUNT(*) AS total FROM \`${metadata.tableName}\``
      )
      assert.equal(
        rows[0].total,
        '0',
        `Test requires empty table ${metadata.tableName}`
      )
    }
  }
  try {
    await assertEmpty()
    const health = await originalFetch(origin + '/api/health')
    assert.deepEqual(await health.json(), { status: 'ok' })
    const anonymous = await originalFetch(origin + '/api/auth/session')
    assert.equal(anonymous.status, 401)
    writeFileSync(
      manifest,
      JSON.stringify({
        database: environment.database,
        adminId,
        accountId,
        profileId,
        tokenId,
        username,
        adminUsername,
        counterKeys
      }),
      { mode: 0o600, flag: 'wx' }
    )
    owned = true
    const hash = await new PasswordService().hash(password)
    await source.transaction(async (manager) => {
      await manager.getRepository(AccountEntity).insert([
        {
          id: adminId,
          name: 'Synthetic fixture administrator',
          username: adminUsername,
          passwordHash: hash,
          role: 'administrator',
          status: 'active'
        },
        {
          id: accountId,
          name: 'Synthetic fixture professional',
          username,
          passwordHash: null,
          role: 'professional',
          status: 'pending'
        }
      ])
      await manager
        .getRepository(ProfessionalEntity)
        .insert({ id: profileId, accountId, createdByAccountId: adminId })
      await manager
        .getRepository(AccountTokenEntity)
        .insert({
          id: tokenId,
          accountId,
          issuedByAccountId: adminId,
          purpose: 'activation',
          tokenDigest: opaqueTokenDigest(token),
          expiresAt: new Date(Date.now() + 86_400_000)
        })
    })
    globalThis.fetch = async (path, options) => {
      assert.ok(String(path).startsWith('/api/auth/'))
      const headers = new Headers(options?.headers)
      if (options?.method === 'POST') headers.set('Origin', origin)
      if (cookie) headers.set('Cookie', cookie)
      const response = await originalFetch(new URL(String(path), origin), {
        ...options,
        headers
      })
      const issued = response.headers.getSetCookie()
      if (issued.length) cookie = issued[0].split(';')[0]
      return response
    }
    await activateAccount(token, password)
    assert.equal(cookie, '', 'Activation does not log in automatically')
    await assert.rejects(
      activateAccount(token, password),
      (failure) => failure instanceof ApiError && failure.status === 400
    )
    await login(username, password)
    assert.ok(cookie.startsWith('emotions_session_local='))
    const session = await loadSession(new AbortController().signal)
    assert.equal(session.user.id, accountId)
    assert.equal(session.user.role, 'professional')
    await logout(session.csrfToken)
    await assert.rejects(
      loadSession(new AbortController().signal),
      (failure) => failure instanceof ApiError && failure.status === 401
    )
    const blocked = await originalFetch(origin + '/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emotions-Request': '1',
        Origin: 'http://127.0.0.1:5999'
      },
      body: JSON.stringify({ username, password })
    })
    assert.equal(
      blocked.status,
      403,
      'Proxy must preserve Origin security check'
    )
  } finally {
    globalThis.fetch = originalFetch
    try {
      if (owned) {
        await source.transaction(async (manager) => {
          await manager
            .getRepository(AccountTokenEntity)
            .delete({ id: tokenId, accountId })
          await manager.getRepository(AuthSessionEntity).delete({ accountId })
          await manager
            .getRepository(ProfessionalEntity)
            .delete({ id: profileId, accountId })
          await manager
            .getRepository(AccountEntity)
            .delete({ id: accountId, username })
          await manager
            .getRepository(AccountEntity)
            .delete({ id: adminId, username: adminUsername })
          for (const key of counterKeys)
            await manager.getRepository(AuthRateLimitEntity).delete(key)
        })
        await assertEmpty()
        unlinkSync(manifest)
      }
    } finally {
      await source.destroy()
    }
  }
})
