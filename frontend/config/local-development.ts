import type { Plugin } from 'vite'

const loopback = new Set(['127.0.0.1', 'localhost', '::1'])

export function localDevelopmentOnly(): Plugin {
  return {
    name: 'emotions-local-development-only',
    configResolved(config) {
      for (const server of [config.server, config.preview]) {
        if (
          typeof server.host !== 'string' ||
          !loopback.has(server.host) ||
          server.cors !== false
        )
          throw new Error(
            'Vite e preview exigem host de loopback e CORS desativado. Use uma entrega de produção própria para publicação.'
          )
      }
    }
  }
}
