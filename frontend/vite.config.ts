import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiPort = process.env.EMOTIONS_API_PORT ?? '3000'
if (!/^[1-9]\d{0,4}$/.test(apiPort) || Number(apiPort) > 65535) {
  throw new Error('EMOTIONS_API_PORT deve ser uma porta TCP válida.')
}

// Same-origin browser requests retain the original Origin and Host for API checks.
const proxy = {
  '/api': {
    target: `http://127.0.0.1:${apiPort}`,
    changeOrigin: false,
    rewrite: (path: string) => path.replace(/^\/api(?=\/|$)/, '')
  }
}

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, proxy }
})
