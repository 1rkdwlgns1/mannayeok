const BACKEND_API_BASE_URL = String(import.meta.env.VITE_BACKEND_API_URL || '').replace(/\/$/, '')
const TRANSIT_ROUTE_CACHE_TTL_MS = 5 * 60 * 1000
const TRANSIT_NO_ROUTE_CACHE_TTL_MS = 60 * 1000
const transitRouteCache = new Map()

export async function fetchTransitRoute(departure, arrival, { searchType = 'optimal' } = {}) {
  const normalizedDeparture = normalizeStationName(departure)
  const normalizedArrival = normalizeStationName(arrival)

  if (!normalizedDeparture || !normalizedArrival) {
    throw new Error('출발역과 도착역 정보가 필요합니다.')
  }

  const cacheKey = `${normalizedDeparture}:${normalizedArrival}:${searchType}`
  const cachedEntry = transitRouteCache.get(cacheKey)
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return cachedEntry.routePromise
  }
  transitRouteCache.delete(cacheKey)

  const routePromise = requestTransitRoute(normalizedDeparture, normalizedArrival, searchType)
    .catch((error) => {
      if (error?.code === 'TRANSIT_ROUTE_NOT_FOUND') {
        const failedEntry = transitRouteCache.get(cacheKey)
        if (failedEntry?.routePromise === routePromise) {
          failedEntry.expiresAt = Date.now() + TRANSIT_NO_ROUTE_CACHE_TTL_MS
        }
      } else {
        transitRouteCache.delete(cacheKey)
      }
      throw error
    })

  transitRouteCache.set(cacheKey, {
    expiresAt: Date.now() + TRANSIT_ROUTE_CACHE_TTL_MS,
    routePromise,
  })
  return routePromise
}

export async function fetchTransitRouteWithRetry(
  departure,
  arrival,
  { maxAttempts = 2, retryDelayMs = 350, searchType = 'optimal' } = {},
) {
  let lastError

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetchTransitRoute(departure, arrival, { searchType })
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts && shouldRetryTransitRoute(error)) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, retryDelayMs)
        })
      } else {
        break
      }
    }
  }

  throw lastError
}

async function requestTransitRoute(departure, arrival, searchType) {
  const params = new URLSearchParams({
    departure,
    arrival,
    searchType,
  })
  const response = await fetch(
    `${BACKEND_API_BASE_URL}/api/transit/routes?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (response.status === 204) {
    const error = new Error('조회 가능한 지하철 운행 경로가 없습니다.')
    error.status = response.status
    error.code = 'TRANSIT_ROUTE_NOT_FOUND'
    throw error
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const error = new Error(errorBody?.message || '공공 지하철 경로를 불러오지 못했습니다.')
    error.status = response.status
    error.code = errorBody?.code || 'TRANSIT_ROUTE_ERROR'
    throw error
  }

  const route = await response.json()
  if (!Number.isFinite(route?.minutes)) {
    throw new Error('공공 지하철 경로 응답에 이동시간이 없습니다.')
  }

  return route
}

function shouldRetryTransitRoute(error) {
  if (error?.code === 'TRANSIT_ROUTE_NOT_FOUND') return false

  if (!Number.isFinite(error?.status)) return true
  return [408, 429, 500, 502, 503, 504].includes(error.status)
}

export function normalizeStationName(stationName) {
  const normalized = String(stationName || '')
    .trim()
    .replace(
      /\s*(?:0?\d+호선|인천(?:\d+호선|선)|경의(?:·)?중앙선|경의선|경춘선|경강선|서해선|수인분당선|신분당선|GTX-A|공항철도|김포골드라인|김포도시철도|용인경전철|에버라인|우이신설경전철|우이신설선|신림선|의정부경전철|경전철의정부)$/i,
      '',
    )
    .trim()

  return normalized.replace(/역$/, '')
}
