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
      localKakaoApiPlugin(env.KAKAO_REST_API_KEY || env.VITE_KAKAO_REST_API_KEY),
    ],
  }
})

function localKakaoApiPlugin(restApiKey) {
  return {
    name: 'local-kakao-api',
    configureServer(server) {
      server.middlewares.use('/api/kakao-local', async (request, response) => {
        if (request.method === 'OPTIONS') {
          response.statusCode = 204
          response.end()
          return
        }

        if (request.method !== 'GET') {
          sendJson(response, 405, { error: 'Method not allowed' })
          return
        }

        if (!restApiKey) {
          sendJson(response, 500, { error: 'KAKAO_REST_API_KEY is not configured' })
          return
        }

        const requestUrl = new URL(request.url || '/', 'http://localhost')
        const type = requestUrl.searchParams.get('type')
        const endpoint = type === 'category' ? 'category.json' : type === 'keyword' ? 'keyword.json' : null

        if (!endpoint) {
          sendJson(response, 400, { error: 'Invalid local search type' })
          return
        }

        requestUrl.searchParams.delete('type')

        try {
          const kakaoResponse = await fetch(
            `https://dapi.kakao.com/v2/local/search/${endpoint}?${requestUrl.searchParams.toString()}`,
            {
              headers: {
                Authorization: `KakaoAK ${restApiKey}`,
              },
            },
          )
          const body = await kakaoResponse.text()

          response.statusCode = kakaoResponse.status
          response.setHeader('Content-Type', kakaoResponse.headers.get('content-type') || 'application/json')
          response.end(body)
        } catch {
          sendJson(response, 502, { error: 'Kakao Local API request failed' })
        }
      })
    },
  }
}

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}
