import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveConfig } from 'vite'
import { localDevelopmentOnly } from '../config/local-development.ts'

for (const host of ['127.0.0.1', 'localhost', '::1'])
  test('accepts loopback configuration: ' + host, async () => {
    const config = await resolveConfig(
      {
        configFile: false,
        envDir: false,
        plugins: [localDevelopmentOnly()],
        server: { host, cors: false },
        preview: { host, cors: false }
      },
      'serve'
    )
    assert.equal(config.server.host, host)
  })
for (const field of ['server', 'preview'] as const)
  for (const override of [
    { host: '0.0.0.0' },
    { host: '::' },
    { host: true },
    { host: '192.0.2.1' },
    { cors: true }
  ] as const)
    test(
      'rejects exposed ' + field + ': ' + JSON.stringify(override),
      async () => {
        await assert.rejects(
          resolveConfig(
            {
              configFile: false,
              envDir: false,
              plugins: [localDevelopmentOnly()],
              server: { host: '127.0.0.1', cors: false },
              preview: { host: '127.0.0.1', cors: false },
              [field]: { host: '127.0.0.1', cors: false, ...override }
            },
            'serve'
          ),
          /exigem host de loopback/
        )
      }
    )
