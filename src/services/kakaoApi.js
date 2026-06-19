import {
  MEETING_HUB_STATIONS,
  getContextualHubStationKeywords,
  getDistanceFromCenter,
  getRouteStationSearchAreas,
  getStationSearchAreas,
  isSeoulMetroArea,
  rankMeetingStations,
  shouldIncludeHubStation,
} from './meetingRecommender'
import { getStationLines } from '../data/subwayStationLines'

const KAKAO_SCRIPT_ID = 'kakao-map-sdk-script'
const KAKAO_SDK_URL = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services'
const KAKAO_DIRECTIONS_URL = 'https://apis-navi.kakaomobility.com/v1/directions'
const STATION_COUNTS_CACHE_KEY = 'mannayeok:station-counts-cache'
const STATION_COUNTS_CACHE_TTL = 1000 * 60 * 60 * 24 * 7
const LOCAL_SEARCH_CONCURRENCY = 5
const COMMERCIAL_SCORING_CANDIDATE_LIMIT = 25

const PLACE_CATEGORIES = {
  cafe: {
    code: 'CE7',
    errorMessage: '근처 카페 검색에 실패했습니다.',
    type: 'category',
  },
  restaurant: {
    code: 'FD6',
    errorMessage: '근처 맛집 검색에 실패했습니다.',
    type: 'category',
  },
  bar: {
    keyword: '술집',
    errorMessage: '근처 술집 검색에 실패했습니다.',
    type: 'keyword',
  },
  activity: {
    code: 'CT1',
    errorMessage: '근처 놀거리 검색에 실패했습니다.',
    type: 'category',
  },
}

const COMMERCIAL_CATEGORY_CODES = ['MT1', 'CS2', 'CT1']

let scriptLoadingPromise = null

function shouldUseLocalApiProxy() {
  if (typeof window === 'undefined') return false

  return !['localhost', '127.0.0.1'].includes(window.location.hostname)
}

export function loadKakaoMapSdk() {
  if (window.kakao?.maps?.services) {
    return Promise.resolve(window.kakao)
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise
  }

  const appKey = import.meta.env.VITE_KAKAO_MAP_KEY
  if (!appKey) {
    return Promise.reject(new Error('VITE_KAKAO_MAP_KEY 환경변수가 필요합니다.'))
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    let script = document.getElementById(KAKAO_SCRIPT_ID)

    if (!script) {
      script = document.createElement('script')
      script.id = KAKAO_SCRIPT_ID
      script.src = `${KAKAO_SDK_URL}&appkey=${appKey}`
      script.async = true
      script.onerror = () => reject(new Error('Kakao Map SDK 로드에 실패했습니다.'))
      document.head.appendChild(script)
    }

    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao))
    }
  })

  return scriptLoadingPromise
}

async function searchLocalCategory(kakao, categoryCode, options, errorMessage) {
  if (shouldUseLocalApiProxy()) {
    return requestLocalApi('category', {
      category_group_code: categoryCode,
      ...formatLocalSearchOptions(options),
    })
  }

  return new Promise((resolve, reject) => {
    const places = new kakao.maps.services.Places()

    places.categorySearch(
      categoryCode,
      (result, status, pagination) => {
        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve({ documents: [], meta: { total_count: 0 } })
          return
        }

        if (status !== kakao.maps.services.Status.OK) {
          reject(new Error(errorMessage))
          return
        }

        resolve({
          documents: result,
          meta: { total_count: pagination?.totalCount || result.length },
        })
      },
      options,
    )
  })
}

async function searchLocalKeyword(kakao, keyword, options, errorMessage) {
  if (shouldUseLocalApiProxy()) {
    return requestLocalApi('keyword', {
      query: keyword,
      ...formatLocalSearchOptions(options),
    })
  }

  return new Promise((resolve, reject) => {
    const places = new kakao.maps.services.Places()

    places.keywordSearch(
      keyword,
      (result, status, pagination) => {
        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve({ documents: [], meta: { total_count: 0 } })
          return
        }

        if (status !== kakao.maps.services.Status.OK) {
          reject(new Error(errorMessage))
          return
        }

        resolve({
          documents: result,
          meta: { total_count: pagination?.totalCount || result.length },
        })
      },
      options,
    )
  })
}

async function requestLocalApi(type, params) {
  const query = new URLSearchParams({ type })

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })

  const response = await fetch(`/api/kakao-local?${query.toString()}`)

  if (!response.ok) {
    throw new Error('카카오 로컬 검색에 실패했습니다.')
  }

  return response.json()
}

function formatLocalSearchOptions(options = {}) {
  const sort = options.sort === window.kakao?.maps?.services?.SortBy?.DISTANCE ? 'distance' : undefined

  return {
    x: options.x,
    y: options.y,
    radius: options.radius,
    page: options.page,
    size: options.size,
    sort,
  }
}

function mapLocalPlace(place) {
  return {
    id: place.id,
    name: place.place_name,
    address: place.road_address_name || place.address_name,
    distance: Number(place.distance || 0),
    lat: Number(place.y),
    lng: Number(place.x),
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))

  return results
}

export async function geocodeAddress(address) {
  const kakao = await loadKakaoMapSdk()

  return new Promise((resolve, reject) => {
    const geocoder = new kakao.maps.services.Geocoder()
    const places = new kakao.maps.services.Places()

    const resolveLocation = (location) => {
      resolve({
        address,
        lat: Number(location.y),
        lng: Number(location.x),
      })
    }

    geocoder.addressSearch(address, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        resolveLocation(result[0])
        return
      }

      places.keywordSearch(address, (keywordResult, keywordStatus) => {
        if (keywordStatus !== kakao.maps.services.Status.OK || !keywordResult[0]) {
          reject(new Error(`주소 또는 장소를 찾을 수 없습니다: ${address}`))
          return
        }

        resolveLocation(keywordResult[0])
      })
    })
  })
}

export async function enrichOriginsWithNearbyStations(origins) {
  const kakao = await loadKakaoMapSdk()

  return Promise.all(origins.map((origin) => enrichOriginWithNearbyStation(kakao, origin)))
}

function enrichOriginWithNearbyStation(kakao, origin) {
  if (origin.transitLines?.length) {
    return Promise.resolve(origin)
  }

  const existingLines = getStationLines(origin.routeName || origin.address)

  if (existingLines.length) {
    return Promise.resolve({
      ...origin,
      transitLines: existingLines,
    })
  }

  return searchLocalCategory(
    kakao,
    'SW8',
    {
      x: origin.lng,
      y: origin.lat,
      radius: 1800,
      sort: kakao.maps.services.SortBy.DISTANCE,
      size: 1,
    },
    '근처 지하철역 검색에 실패했습니다.',
  )
    .then(({ documents }) => {
      if (!documents[0]) return origin

      const nearestStation = documents[0]
      const transitLines = getStationLines(nearestStation.place_name)

      return {
        ...origin,
        nearbyStationName: nearestStation.place_name,
        transitLines,
      }
    })
    .catch(() => origin)
}

export async function searchAddressSuggestions(query) {
  const keyword = query.trim()
  if (!keyword) return []

  const kakao = await loadKakaoMapSdk()

  return new Promise((resolve, reject) => {
    const geocoder = new kakao.maps.services.Geocoder()
    const places = new kakao.maps.services.Places()

    const searchPlaces = () => {
      places.keywordSearch(keyword, (result, status) => {
        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve([])
          return
        }

        if (status !== kakao.maps.services.Status.OK) {
          reject(new Error('장소 검색에 실패했습니다.'))
          return
        }

        resolve(
          result.slice(0, 5).map((item) => ({
            id: item.id,
            address: item.road_address_name || item.address_name || item.place_name,
            roadAddress: item.place_name,
            routeName: item.place_name,
            lat: Number(item.y),
            lng: Number(item.x),
          })),
        )
      })
    }

    geocoder.addressSearch(keyword, (result, status) => {
      if (status === kakao.maps.services.Status.ZERO_RESULT) {
        searchPlaces()
        return
      }

      if (status !== kakao.maps.services.Status.OK) {
        reject(new Error('주소 검색에 실패했습니다.'))
        return
      }

      resolve(
        result.slice(0, 5).map((item) => ({
          id: `${item.x}-${item.y}-${item.address_name}`,
          address: item.address_name,
          roadAddress: item.road_address?.address_name || '',
          routeName: item.road_address?.address_name || item.address_name,
          lat: Number(item.y),
          lng: Number(item.x),
        })),
      )
    })
  })
}

export async function searchNearbyPlaces(center, category = 'cafe') {
  const kakao = await loadKakaoMapSdk()
  const placeCategory = PLACE_CATEGORIES[category] || PLACE_CATEGORIES.cafe

  if (placeCategory.type === 'keyword') {
    return searchNearbyPlacesByKeyword(kakao, center, placeCategory)
  }

  const { documents } = await searchLocalCategory(
    kakao,
    placeCategory.code,
    {
      x: center.lng,
      y: center.lat,
      radius: 1000,
      sort: kakao.maps.services.SortBy.DISTANCE,
      size: 5,
    },
    placeCategory.errorMessage,
  )

  return documents.slice(0, 5).map(mapLocalPlace)
}

async function searchNearbyPlacesByKeyword(kakao, center, placeCategory) {
  const { documents } = await searchLocalKeyword(
    kakao,
    placeCategory.keyword,
    {
      x: center.lng,
      y: center.lat,
      radius: 1000,
      sort: kakao.maps.services.SortBy.DISTANCE,
      size: 5,
    },
    placeCategory.errorMessage,
  )

  return documents.slice(0, 5).map(mapLocalPlace)
}

export function searchNearbyCafes(center) {
  return searchNearbyPlaces(center, 'cafe')
}

export async function searchRecommendedStations(center, origins = [], limit = 3) {
  const kakao = await loadKakaoMapSdk()
  const enrichedOrigins = await enrichOriginsWithNearbyStations(origins)
  const candidateMap = new Map()

  const nearbyCandidateGroups = await mapWithConcurrency(getStationSearchAreas(center), LOCAL_SEARCH_CONCURRENCY, (
    searchArea,
  ) => searchStationCandidates(kakao, searchArea.center, searchArea.radius, center, 'center'))

  nearbyCandidateGroups.flat().forEach((station) => {
    if (!candidateMap.has(station.id)) {
      candidateMap.set(station.id, station)
    }
  })

  const routeCandidateGroups = await mapWithConcurrency(getRouteStationSearchAreas(enrichedOrigins), LOCAL_SEARCH_CONCURRENCY, (
    searchArea,
  ) => searchStationCandidates(kakao, searchArea.center, searchArea.radius, center, 'route'))

  routeCandidateGroups.flat().forEach((station) => {
    if (!candidateMap.has(station.id)) {
      candidateMap.set(station.id, station)
    }
  })

  if (isSeoulMetroArea(center)) {
    const hubCandidates = await searchMeetingHubStations(kakao, center)

    hubCandidates
      .filter((station) => shouldIncludeHubStation(center, station))
      .forEach((station) => {
        if (!candidateMap.has(station.id)) {
          candidateMap.set(station.id, station)
        }
      })
  }

  const contextualHubCandidates = await searchContextualHubStations(kakao, center, enrichedOrigins)

  contextualHubCandidates.forEach((station) => {
    const existingStation = candidateMap.get(station.id)

    candidateMap.set(station.id, {
      ...existingStation,
      ...station,
      isContextualCandidate: true,
    })
  })

  const allCandidates = [...candidateMap.values()].sort((a, b) => a.distanceFromCenter - b.distanceFromCenter)
  const nearbyCandidates = allCandidates
    .filter((station) => !station.isHubCandidate && !station.isRouteCandidate && !station.isContextualCandidate)
    .slice(0, 18)
  const routeCandidates = allCandidates.filter((station) => station.isRouteCandidate).slice(0, 24)
  const hubCandidates = allCandidates.filter((station) => station.isHubCandidate).slice(0, 18)
  const contextualCandidates = allCandidates.filter((station) => station.isContextualCandidate).slice(0, 8)
  const candidates = [
    ...new Map(
      [...nearbyCandidates, ...routeCandidates, ...hubCandidates, ...contextualCandidates].map((station) => [
        station.id,
        station,
      ]),
    ).values(),
  ]

  const candidatesForCommercialScoring = selectCandidatesForCommercialScoring(candidates, enrichedOrigins)
  const scoredStations = await mapWithConcurrency(candidatesForCommercialScoring, LOCAL_SEARCH_CONCURRENCY, (station) =>
    addStationCounts(kakao, station),
  )

  return rankMeetingStations(scoredStations, enrichedOrigins, limit)
}

function selectCandidatesForCommercialScoring(candidates, origins) {
  const preliminaryRank = rankMeetingStations(candidates, origins, candidates.length)
  const selectedNames = new Set()

  return [...preliminaryRank.meetingStations, ...preliminaryRank.fairStations]
    .sort((a, b) => Math.max(b.meetingScore, b.fairScore) - Math.max(a.meetingScore, a.fairScore))
    .filter((station) => {
      if (selectedNames.has(station.name)) return false

      selectedNames.add(station.name)
      return true
    })
    .slice(0, COMMERCIAL_SCORING_CANDIDATE_LIMIT)
}

export async function getRoadRoutePath(origin, destination) {
  const params = new URLSearchParams({
    destination: `${destination.lng},${destination.lat}`,
    origin: `${origin.lng},${origin.lat}`,
    priority: 'RECOMMEND',
  })

  const response = shouldUseLocalApiProxy()
    ? await fetch(`/api/kakao-directions?${params.toString()}`)
    : await fetchDevKakaoDirections(params)

  if (!response) return null

  if (!response.ok) {
    throw new Error('Route search failed')
  }

  const data = await response.json()
  const roads = data.routes?.[0]?.sections?.flatMap((section) => section.roads || []) || []
  const coordinates = roads.flatMap((road) => {
    const vertexes = road.vertexes || []
    const points = []

    for (let index = 0; index < vertexes.length; index += 2) {
      points.push({
        lng: Number(vertexes[index]),
        lat: Number(vertexes[index + 1]),
      })
    }

    return points
  })

  return coordinates.length ? coordinates : null
}

function fetchDevKakaoDirections(params) {
  const restApiKey = import.meta.env.VITE_KAKAO_MOBILITY_KEY

  if (!restApiKey) return null

  return fetch(`${KAKAO_DIRECTIONS_URL}?${params.toString()}`, {
    headers: {
      Authorization: `KakaoAK ${restApiKey}`,
      'Content-Type': 'application/json',
    },
  })
}

async function searchStationCandidates(kakao, searchCenter, radius, originalCenter, source = 'center') {
  const { documents } = await searchLocalCategory(
    kakao,
    'SW8',
    {
      x: searchCenter.lng,
      y: searchCenter.lat,
      radius,
      sort: kakao.maps.services.SortBy.DISTANCE,
      size: 15,
    },
    '추천 중간역 검색에 실패했습니다.',
  )

  return documents.map((station) => ({
    id: station.id,
    name: station.place_name,
    routeName: station.place_name,
    address: station.road_address_name || station.address_name,
    distanceFromCenter: getDistanceFromCenter(originalCenter, station),
    isRouteCandidate: source === 'route',
    lat: Number(station.y),
    lng: Number(station.x),
  }))
}
async function addStationCounts(kakao, station) {
  const cachedCounts = getCachedStationCounts(station)

  if (cachedCounts) {
    return {
      ...station,
      ...cachedCounts,
    }
  }

  const [cafeCount, restaurantCount, commercialCount] = await Promise.all([
    countNearbyCategory(kakao, station, PLACE_CATEGORIES.cafe.code),
    countNearbyCategory(kakao, station, PLACE_CATEGORIES.restaurant.code),
    countNearbyCommercialFacilities(kakao, station),
  ])

  const counts = {
    cafeCount,
    restaurantCount,
    commercialCount,
    hotPlaceCount: cafeCount + restaurantCount + commercialCount,
    hotPlaceSignal: cafeCount * 1.2 + restaurantCount * 1.35 + commercialCount * 0.35,
  }

  setCachedStationCounts(station, counts)

  return {
    ...station,
    ...counts,
  }
}

function getCachedStationCounts(station) {
  if (typeof window === 'undefined') return null

  try {
    const cache = JSON.parse(window.localStorage.getItem(STATION_COUNTS_CACHE_KEY) || '{}')
    const cached = cache[getStationCountsCacheKey(station)]

    if (!cached || Date.now() - cached.cachedAt > STATION_COUNTS_CACHE_TTL) {
      return null
    }

    return cached.counts
  } catch {
    return null
  }
}

function setCachedStationCounts(station, counts) {
  if (typeof window === 'undefined') return

  try {
    const cache = JSON.parse(window.localStorage.getItem(STATION_COUNTS_CACHE_KEY) || '{}')
    cache[getStationCountsCacheKey(station)] = {
      cachedAt: Date.now(),
      counts,
    }

    window.localStorage.setItem(STATION_COUNTS_CACHE_KEY, JSON.stringify(pruneStationCountsCache(cache)))
  } catch {
    // 캐시 저장 실패는 추천 계산 자체를 막지 않습니다.
  }
}

function pruneStationCountsCache(cache) {
  const entries = Object.entries(cache)
    .filter(([, value]) => Date.now() - value.cachedAt <= STATION_COUNTS_CACHE_TTL)
    .sort((a, b) => b[1].cachedAt - a[1].cachedAt)
    .slice(0, 180)

  return Object.fromEntries(entries)
}

function getStationCountsCacheKey(station) {
  return `${station.id || station.name}:${Number(station.lat).toFixed(5)},${Number(station.lng).toFixed(5)}`
}

async function countNearbyCommercialFacilities(kakao, station) {
  const counts = await Promise.all(
    COMMERCIAL_CATEGORY_CODES.map((categoryCode) => countNearbyCategory(kakao, station, categoryCode)),
  )

  return counts.reduce((sum, count) => sum + count, 0)
}

async function countNearbyCategory(kakao, center, categoryCode) {
  const { documents, meta } = await searchLocalCategory(
    kakao,
    categoryCode,
    {
      x: center.lng,
      y: center.lat,
      radius: 1000,
      size: 1,
    },
    '주변 장소 밀도 계산에 실패했습니다.',
  )

  return meta?.total_count || documents.length
}

function searchMeetingHubStations(kakao, center) {
  return mapWithConcurrency(MEETING_HUB_STATIONS, LOCAL_SEARCH_CONCURRENCY, (keyword) =>
    searchStationByKeyword(kakao, keyword, center),
  ).then((stations) => stations.filter(Boolean))
}

function searchContextualHubStations(kakao, center, origins) {
  const keywords = getContextualHubStationKeywords(origins)

  if (!keywords.length) return Promise.resolve([])

  return mapWithConcurrency(keywords, LOCAL_SEARCH_CONCURRENCY, (keyword) =>
    searchStationByKeyword(kakao, keyword, center),
  ).then((stations) =>
    stations.filter(Boolean).map((station) => ({
      ...station,
      isContextualCandidate: true,
    })),
  )
}

async function searchStationByKeyword(kakao, keyword, center) {
  const { documents } = await searchLocalKeyword(
    kakao,
    keyword,
    {
      size: 15,
    },
    '약속 허브 역 검색에 실패했습니다.',
  )

  const station =
    documents.find((place) => place.category_group_code === 'SW8') ||
    documents.find((place) => place.place_name.includes(keyword.replace('역', '')))

  if (!station) return null

  return {
    id: station.id,
    name: station.place_name,
    routeName: station.place_name,
    address: station.road_address_name || station.address_name,
    distanceFromCenter: getDistanceFromCenter(center, station),
    isHubCandidate: true,
    lat: Number(station.y),
    lng: Number(station.x),
  }
}
