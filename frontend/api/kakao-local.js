/* global process */

import { validateKakaoLocalRequest } from '../shared/kakaoLocalRequest.js'

const KAKAO_LOCAL_BASE_URL = 'https://dapi.kakao.com/v2/local/search'
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 180
const requestCounts = new Map()

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    response.status(204).end()
    return
  }

  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!consumeRequestAllowance(getClientIp(request))) {
    response.setHeader('Retry-After', '60')
    response.status(429).json({ error: 'Too many requests' })
    return
  }

  const restApiKey = process.env.KAKAO_REST_API_KEY

  if (!restApiKey) {
    response.status(500).json({ error: 'KAKAO_REST_API_KEY is not configured' })
    return
  }

  const validation = validateKakaoLocalRequest(toSearchParams(request.query))
  if (validation.error) {
    response.status(400).json({ error: validation.error })
    return
  }

  const { endpoint, params } = validation

  try {
    const kakaoResponse = await fetch(`${KAKAO_LOCAL_BASE_URL}/${endpoint}?${params.toString()}`, {
      headers: {
        Authorization: `KakaoAK ${restApiKey}`,
      },
    })

    const bodyText = await kakaoResponse.text()
    response.status(kakaoResponse.status)
    response.setHeader('Content-Type', kakaoResponse.headers.get('content-type') || 'application/json')
    response.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    response.send(bodyText)
  } catch {
    response.status(502).json({ error: 'Kakao Local API request failed' })
  }
}

function toSearchParams(query) {
  const params = new URLSearchParams()

  Object.entries(query || {}).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value]
    values.forEach((item) => {
      if (item !== undefined && item !== null && item !== '') {
        params.append(key, String(item))
      }
    })
  })

  return params
}

function getClientIp(request) {
  const forwardedFor = request.headers['x-forwarded-for']
  const firstForwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]

  return firstForwardedIp?.trim() || request.socket?.remoteAddress || 'unknown'
}

function consumeRequestAllowance(clientIp) {
  const now = Date.now()
  const existing = requestCounts.get(clientIp)

  if (!existing || now - existing.startedAt >= RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(clientIp, { count: 1, startedAt: now })
    pruneRequestCounts(now)
    return true
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) return false

  existing.count += 1
  return true
}

function pruneRequestCounts(now) {
  if (requestCounts.size < 500) return

  requestCounts.forEach((entry, clientIp) => {
    if (now - entry.startedAt >= RATE_LIMIT_WINDOW_MS) {
      requestCounts.delete(clientIp)
    }
  })
}
