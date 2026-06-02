import {
  MEETING_HUB_STATIONS,
  getDistanceFromCenter,
  getStationSearchAreas,
  isSeoulMetroArea,
  rankMeetingStations,
  shouldIncludeHubStation,
} from './meetingRecommender'

const KAKAO_SCRIPT_ID = 'kakao-map-sdk-script'
const KAKAO_SDK_URL = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services'

const PLACE_CATEGORIES = {
  cafe: {
    code: 'CE7',
    errorMessage: '근처 카페 검색에 실패했습니다.',
  },
  restaurant: {
    code: 'FD6',
    errorMessage: '근처 맛집 검색에 실패했습니다.',
  },
}

const COMMERCIAL_CATEGORY_CODES = ['MT1', 'CS2', 'CT1']

let scriptLoadingPromise = null

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

  return new Promise((resolve, reject) => {
    const places = new kakao.maps.services.Places()

    places.categorySearch(
      placeCategory.code,
      (result, status) => {
        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve([])
          return
        }

        if (status !== kakao.maps.services.Status.OK) {
          reject(new Error(placeCategory.errorMessage))
          return
        }

        resolve(
          result.slice(0, 5).map((place) => ({
            id: place.id,
            name: place.place_name,
            address: place.road_address_name || place.address_name,
            distance: Number(place.distance),
            lat: Number(place.y),
            lng: Number(place.x),
          })),
        )
      },
      {
        x: center.lng,
        y: center.lat,
        radius: 1000,
        sort: kakao.maps.services.SortBy.DISTANCE,
      },
    )
  })
}

export function searchNearbyCafes(center) {
  return searchNearbyPlaces(center, 'cafe')
}

export async function searchRecommendedStations(center, origins = [], limit = 3) {
  const kakao = await loadKakaoMapSdk()
  const candidateMap = new Map()

  for (const searchArea of getStationSearchAreas(center)) {
    const candidates = await searchStationCandidates(kakao, searchArea.center, searchArea.radius, center)

    candidates.forEach((station) => {
      if (!candidateMap.has(station.id)) {
        candidateMap.set(station.id, station)
      }
    })
  }

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

  const allCandidates = [...candidateMap.values()].sort((a, b) => a.distanceFromCenter - b.distanceFromCenter)
  const nearbyCandidates = allCandidates.filter((station) => !station.isHubCandidate).slice(0, 18)
  const hubCandidates = allCandidates.filter((station) => station.isHubCandidate).slice(0, 18)
  const candidates = [...new Map([...nearbyCandidates, ...hubCandidates].map((station) => [station.id, station])).values()]

  const scoredStations = await Promise.all(candidates.map((station) => addStationCounts(kakao, station)))

  return rankMeetingStations(scoredStations, origins, limit)
}

function searchStationCandidates(kakao, searchCenter, radius, originalCenter) {
  return new Promise((resolve, reject) => {
    const places = new kakao.maps.services.Places()

    places.categorySearch(
      'SW8',
      (result, status) => {
        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve([])
          return
        }

        if (status !== kakao.maps.services.Status.OK) {
          reject(new Error('추천 중간역 검색에 실패했습니다.'))
          return
        }

        resolve(
          result.map((station) => ({
            id: station.id,
            name: station.place_name,
            address: station.road_address_name || station.address_name,
            distanceFromCenter: getDistanceFromCenter(originalCenter, station),
            lat: Number(station.y),
            lng: Number(station.x),
          })),
        )
      },
      {
        x: searchCenter.lng,
        y: searchCenter.lat,
        radius,
        sort: kakao.maps.services.SortBy.DISTANCE,
      },
    )
  })
}

async function addStationCounts(kakao, station) {
  const [cafeCount, restaurantCount, commercialCount] = await Promise.all([
    countNearbyCategory(kakao, station, PLACE_CATEGORIES.cafe.code),
    countNearbyCategory(kakao, station, PLACE_CATEGORIES.restaurant.code),
    countNearbyCommercialFacilities(kakao, station),
  ])

  return {
    ...station,
    cafeCount,
    restaurantCount,
    commercialCount,
    hotPlaceCount: cafeCount + restaurantCount + commercialCount,
  }
}

async function countNearbyCommercialFacilities(kakao, station) {
  const counts = await Promise.all(
    COMMERCIAL_CATEGORY_CODES.map((categoryCode) => countNearbyCategory(kakao, station, categoryCode)),
  )

  return counts.reduce((sum, count) => sum + count, 0)
}

function countNearbyCategory(kakao, center, categoryCode) {
  return new Promise((resolve, reject) => {
    const places = new kakao.maps.services.Places()

    places.categorySearch(
      categoryCode,
      (result, status, pagination) => {
        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve(0)
          return
        }

        if (status !== kakao.maps.services.Status.OK) {
          reject(new Error('주변 장소 밀도 계산에 실패했습니다.'))
          return
        }

        resolve(pagination?.totalCount || result.length)
      },
      {
        x: center.lng,
        y: center.lat,
        radius: 1000,
      },
    )
  })
}

function searchMeetingHubStations(kakao, center) {
  return Promise.all(MEETING_HUB_STATIONS.map((keyword) => searchStationByKeyword(kakao, keyword, center))).then(
    (stations) => stations.filter(Boolean),
  )
}

function searchStationByKeyword(kakao, keyword, center) {
  return new Promise((resolve, reject) => {
    const places = new kakao.maps.services.Places()

    places.keywordSearch(keyword, (result, status) => {
      if (status === kakao.maps.services.Status.ZERO_RESULT) {
        resolve(null)
        return
      }

      if (status !== kakao.maps.services.Status.OK) {
        reject(new Error('약속 허브 역 검색에 실패했습니다.'))
        return
      }

      const station =
        result.find((place) => place.category_group_code === 'SW8') ||
        result.find((place) => place.place_name.includes(keyword.replace('역', '')))

      if (!station) {
        resolve(null)
        return
      }

      resolve({
        id: station.id,
        name: station.place_name,
        address: station.road_address_name || station.address_name,
        distanceFromCenter: getDistanceFromCenter(center, station),
        isHubCandidate: true,
        lat: Number(station.y),
        lng: Number(station.x),
      })
    })
  })
}
