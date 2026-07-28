const BACKEND_API_BASE_URL = String(import.meta.env.VITE_BACKEND_API_URL || '').replace(/\/$/, '')
const TRANSIT_ROUTE_CACHE_TTL_MS = 5 * 60 * 1000
const transitRouteCache = new Map()

export async function fetchTransitRoute(departure, arrival) {
  const normalizedDeparture = normalizeStationName(departure)
  const normalizedArrival = normalizeStationName(arrival)

  if (!normalizedDeparture || !normalizedArrival) {
    throw new Error('출발역과 도착역 정보가 필요합니다.')
  }

  const cacheKey = `${normalizedDeparture}:${normalizedArrival}:duration`
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

async function requestTransitRoute(departure, arrival) {
  const params = new URLSearchParams({
    departure,
    arrival,
    searchType: 'duration',
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
