const BACKEND_API_BASE_URL = String(import.meta.env.VITE_BACKEND_API_URL || '').replace(/\/$/, '')
const TRANSIT_ROUTE_CACHE_TTL_MS = 5 * 60 * 1000
const transitRouteCache = new Map()

export async function fetchTransitRoute(departure, arrival) {
  const normalizedDeparture = normalizeStationName(departure)
  const normalizedArrival = normalizeStationName(arrival)

  if (!normalizedDeparture || !normalizedArrival) {
    throw new Error('출발역과 도착역 정보가 필요합니다.')
  }

  const cacheKey = `${normalizedDeparture}:${normalizedArrival}:optimal`
  const cachedEntry = transitRouteCache.get(cacheKey)
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return cachedEntry.routePromise
  }
  transitRouteCache.delete(cacheKey)

  const routePromise = requestTransitRoute(normalizedDeparture, normalizedArrival)
    .catch((error) => {
      transitRouteCache.delete(cacheKey)
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
  { maxAttempts = 2, retryDelayMs = 350 } = {},
) {
  let lastError

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetchTransitRoute(departure, arrival)
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, retryDelayMs)
        })
      }
    }
  }

  throw lastError
}

async function requestTransitRoute(departure, arrival) {
  const params = new URLSearchParams({
    departure,
    arrival,
    searchType: 'optimal',
  })
  const response = await fetch(
    `${BACKEND_API_BASE_URL}/api/transit/routes?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error('공공 지하철 경로를 불러오지 못했습니다.')
  }

  const route = await response.json()
  if (!Number.isFinite(route?.minutes)) {
    throw new Error('공공 지하철 경로 응답에 이동시간이 없습니다.')
  }

  return route
}

function normalizeStationName(stationName) {
  return String(stationName || '').trim().replace(/역$/, '')
}
