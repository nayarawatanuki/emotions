import { ChildEntity } from '../../backend/dist/modules/children/entities/child.entity.js'
import {
  createChild,
  updateChild,
  loadChildren,
  loadChild
} from '../src/features/children/children-api.ts'
import {
  createProfessional,
  loadProfessionals,
  reissueInvitation
} from '../src/features/professionals/professionals-api.ts'
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
  const childUsername = 'fixture_frontend_child_' + accountId
  const newUsername = 'fixture_frontend_new_' + accountId
  let createdIdentity: { id: string; accountId: string } | null = null
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
  for (const user of [adminUsername, newUsername])
    counterKeys.push({
      scope: 'login_origin_account',
      keyDigest: keyedDigest(
        process.env.AUTH_SECRET,
        'login-origin-account-v1',
        ['127.0.0.1', user]
      )
    })
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
        newUsername,
        childUsername,
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
      await manager.getRepository(AccountTokenEntity).insert({
        id: tokenId,
        accountId,
        issuedByAccountId: adminId,
        purpose: 'activation',
        tokenDigest: opaqueTokenDigest(token),
        expiresAt: new Date(Date.now() + 86_400_000)
      })
    })
    globalThis.fetch = async (path, options) => {
      assert.match(
        String(path),
        /^\/api\/(auth|professionals|children)(\/|\?|$)/
      )
      const headers = new Headers(options?.headers)
      if (options?.method === 'POST' || options?.method === 'PATCH')
        headers.set('Origin', origin)
      if (cookie) headers.set('Cookie', cookie)
      const response = await originalFetch(new URL(String(path), origin), {
        ...options,
        headers
      })
      const issued = response.headers.getSetCookie()
      if (issued.length) {
        const assigned = issued[0].split(';')[0]
        cookie = assigned.endsWith('=') ? '' : assigned
      }
      return response
    }
    await login(adminUsername, password)
    const administrator = await loadSession(new AbortController().signal)
    await assert.rejects(
      loadChildren(null, new AbortController().signal),
      (failure) => failure instanceof ApiError && failure.status === 403
    )
    const initial = await loadProfessionals(null, new AbortController().signal)
    assert.equal(initial.items.length, 1)
    assert.equal(initial.items[0].id, profileId)
    const created = await createProfessional(
      { name: 'Synthetic created through client', username: newUsername },
      administrator.csrfToken,
      origin
    )
    createdIdentity = created.professional
    const updated = await reissueInvitation(
      created.professional.id,
      administrator.csrfToken,
      origin
    )
    const oldToken = new URL(created.activation.url).hash.slice(7)
    const newToken = new URL(updated.url).hash.slice(7)
    await assert.rejects(
      activateAccount(oldToken, password),
      (failure) => failure instanceof ApiError && failure.status === 400
    )
    await activateAccount(newToken, password)
    await assert.rejects(
      reissueInvitation(
        created.professional.id,
        administrator.csrfToken,
        origin
      ),
      (failure) => failure instanceof ApiError && failure.status === 409
    )
    await logout(administrator.csrfToken)
    assert.equal(
      cookie,
      '',
      'Logout removes the cookie from the simulated browser jar'
    )
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
    const child = await createChild(
      {
        name: 'Synthetic child through client',
        username: childUsername,
        dateOfBirth: '2020-02-29',
        guardianName: 'Synthetic guardian',
        treatmentActive: true,
        reportedLevel: null,
        notes: 'Synthetic clinical notes'
      },
      session.csrfToken
    )
    const children = await loadChildren(null, new AbortController().signal)
    assert.equal(children.items.length, 1)
    assert.equal(children.items[0].id, child.id)
    assert.equal('notes' in children.items[0], false)
    assert.deepEqual(await loadChild(child.id), child)
    const editInput = {
      name: child.name,
      username: child.username,
      dateOfBirth: child.dateOfBirth,
      guardianName: child.guardianName,
      treatmentActive: false,
      reportedLevel: child.reportedLevel,
      notes: 'Updated synthetic notes'
    }
    const edited = await updateChild(
      child.id,
      editInput,
      child.revision,
      session.csrfToken
    )
    assert.equal(edited.notes, editInput.notes)
    assert.notEqual(edited.revision, child.revision)
    await assert.rejects(
      updateChild(child.id, editInput, child.revision, session.csrfToken),
      (failure) => failure instanceof ApiError && failure.status === 409
    )
    const writes = await Promise.allSettled([
      updateChild(
        child.id,
        { ...editInput, notes: 'Concurrent synthetic first' },
        edited.revision,
        session.csrfToken
      ),
      updateChild(
        child.id,
        { ...editInput, notes: 'Concurrent synthetic second' },
        edited.revision,
        session.csrfToken
      )
    ])
    assert.equal(
      writes.filter((result) => result.status === 'fulfilled').length,
      1
    )
    const rejected = writes.find((result) => result.status === 'rejected')
    assert.ok(
      rejected?.status === 'rejected' &&
        rejected.reason instanceof ApiError &&
        rejected.reason.status === 409
    )
    await logout(session.csrfToken)
    await assert.rejects(
      loadSession(new AbortController().signal),
      (failure) => failure instanceof ApiError && failure.status === 401
    )
    await login(newUsername, password)
    const otherSession = await loadSession(new AbortController().signal)
    assert.deepEqual(
      (await loadChildren(null, new AbortController().signal)).items,
      []
    )
    await assert.rejects(
      loadChild(child.id),
      (failure) => failure instanceof ApiError && failure.status === 404
    )
    await logout(otherSession.csrfToken)
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
            .delete({ issuedByAccountId: adminId })
          await manager
            .getRepository(AuthSessionEntity)
            .delete({ accountId: adminId })
          const extra = await manager
            .getRepository(AccountEntity)
            .findOneBy({ username: newUsername })
          if (extra) {
            if (createdIdentity)
              assert.equal(extra.id, createdIdentity.accountId)
            await manager
              .getRepository(AuthSessionEntity)
              .delete({ accountId: extra.id })
            await manager
              .getRepository(ProfessionalEntity)
              .delete({ accountId: extra.id, createdByAccountId: adminId })
            await manager
              .getRepository(AccountEntity)
              .delete({ id: extra.id, username: newUsername })
          }
          await manager.getRepository(AuthSessionEntity).delete({ accountId })
          const childAccount = await manager
            .getRepository(AccountEntity)
            .findOneBy({ username: childUsername })
          if (childAccount) {
            await manager
              .getRepository(ChildEntity)
              .delete({ accountId: childAccount.id, professionalId: profileId })
            await manager
              .getRepository(AccountEntity)
              .delete({ id: childAccount.id, username: childUsername })
          }
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
