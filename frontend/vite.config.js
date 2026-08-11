/* global process */

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api/transit': {
          target: env.BACKEND_API_URL || 'http://localhost:8080',
          changeOrigin: true,
        },
        '/api/kakao': {
          target: env.BACKEND_API_URL || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  }
})
