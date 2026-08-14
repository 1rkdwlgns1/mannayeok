export const recommendationRegressionFixture = {
  scenario: '서울역과 강남역에서 만나는 경우',
  center: {
    lat: 37.526393,
    lng: 126.999351,
  },
  origins: [
    {
      id: 'origin-seoul',
      address: '서울특별시 중구 서울역',
      routeName: '서울역',
      nearbyStationName: '서울역',
      lat: 37.554648,
      lng: 126.970695,
      hasSupportedTransitAccess: true,
      transitLines: ['1호선', '4호선'],
    },
    {
      id: 'origin-gangnam',
      address: '서울특별시 강남구 강남역',
      routeName: '강남역',
      nearbyStationName: '강남역',
      lat: 37.497942,
      lng: 127.027621,
      hasSupportedTransitAccess: true,
      transitLines: ['2호선', '신분당선'],
    },
  ],
  stationDocuments: [
    {
      id: 'station-yongsan',
      place_name: '용산역 1호선',
      road_address_name: '서울 용산구 한강대로23길 55',
      address_name: '서울 용산구 한강로3가 40-999',
      x: '126.964775',
      y: '37.529849',
      category_group_code: 'SW8',
    },
    {
      id: 'station-sinsa',
      place_name: '신사역 3호선',
      road_address_name: '서울 강남구 도산대로 102',
      address_name: '서울 강남구 신사동 667',
      x: '127.020267',
      y: '37.516438',
      category_group_code: 'SW8',
    },
    {
      id: 'station-seoulforest',
      place_name: '서울숲역 수인분당선',
      road_address_name: '서울 성동구 왕십리로 77',
      address_name: '서울 성동구 성수동1가 656-1040',
      x: '127.044609',
      y: '37.543647',
      category_group_code: 'SW8',
    },
    {
      id: 'station-ttukseom',
      place_name: '뚝섬역 2호선',
      road_address_name: '서울 성동구 아차산로 18',
      address_name: '서울 성동구 성수동1가 14-33',
      x: '127.047367',
      y: '37.547184',
      category_group_code: 'SW8',
    },
    {
      id: 'station-wangsimni',
      place_name: '왕십리역 2호선',
      road_address_name: '서울 성동구 왕십리광장로 17',
      address_name: '서울 성동구 행당동 168-151',
      x: '127.037753',
      y: '37.561533',
      category_group_code: 'SW8',
    },
    {
      id: 'station-gongdeok',
      place_name: '공덕역 5호선',
      road_address_name: '서울 마포구 마포대로 100',
      address_name: '서울 마포구 공덕동 423-29',
      x: '126.951913',
      y: '37.544018',
      category_group_code: 'SW8',
    },
  ],
  commercialCounts: {
    CE7: 148,
    FD6: 231,
    CT1: 37,
  },
  nearbyPlaces: [
    {
      id: 'place-cafe-1',
      place_name: '픽스처 카페 첫 번째',
      road_address_name: '서울 용산구 테스트로 1',
      address_name: '서울 용산구 테스트동 1',
      distance: '84',
      x: '126.965100',
      y: '37.530100',
    },
    {
      id: 'place-cafe-2',
      place_name: '픽스처 카페 두 번째',
      road_address_name: '서울 용산구 테스트로 2',
      address_name: '서울 용산구 테스트동 2',
      distance: '163',
      x: '126.965800',
      y: '37.530500',
    },
    {
      id: 'place-cafe-3',
      place_name: '픽스처 카페 세 번째',
      road_address_name: '',
      address_name: '서울 용산구 테스트동 3',
      distance: '241',
      x: '126.966200',
      y: '37.531000',
    },
  ],
  transitRoutesByDeparture: {
    서울: {
      minutes: 24,
      transfers: 1,
      distanceMeters: 7800,
      departureStation: '서울',
      arrivalStation: '왕십리',
      routeSteps: [
        { station: '서울', line: '1호선', transfer: false },
        { station: '동묘앞', line: '1호선', transfer: false },
        { station: '왕십리', line: '2호선', transfer: true },
      ],
    },
    강남: {
      minutes: 32,
      transfers: 0,
      distanceMeters: 14300,
      departureStation: '강남',
      arrivalStation: '왕십리',
      routeSteps: [
        { station: '강남', line: '2호선', transfer: false },
        { station: '왕십리', line: '2호선', transfer: false },
      ],
    },
  },
  expected: {
    meetingStationNames: ['왕십리역', '뚝섬역', '신사역', '용산역'],
    fairStationNames: ['한남역', '옥수역', '이태원역', '신사역'],
    primaryStationName: '왕십리역',
    stationEvaluations: [
      {
        name: '왕십리역',
        meetingScore: 117.59212,
        fairScore: 82.693484,
        centerScore: 76.735,
        fairnessScore: 94.165,
        travelScore: 84.2956,
        commercialScore: 100,
        transitCompatibilityScore: 16,
        originDistances: [5960, 7127],
        transitTimeProfile: {
          hasAllEstimates: true,
          averageMinutes: 19.1,
          minMinutes: 17.7,
          maxMinutes: 20.5,
          maxTransferCount: 0,
          items: [
            { originName: '서울역', minutes: 17.7, transfers: 0 },
            { originName: '강남역', minutes: 20.5, transfers: 0 },
          ],
        },
      },
      {
        name: '뚝섬역',
        meetingScore: 115.02256,
        fairScore: 81.299152,
        centerScore: 78.292,
        fairnessScore: 94.68,
        travelScore: 84.9328,
        commercialScore: 100,
        transitCompatibilityScore: 16,
        originDistances: [6810, 5746],
        transitTimeProfile: {
          hasAllEstimates: true,
          averageMinutes: 17.3,
          minMinutes: 17,
          maxMinutes: 17.5,
          maxTransferCount: 1,
          items: [
            { originName: '서울역', minutes: 17, transfers: 1 },
            { originName: '강남역', minutes: 17.5, transfers: 0 },
          ],
        },
      },
      {
        name: '신사역',
        meetingScore: 114.68028,
        fairScore: 82.872886,
        centerScore: 90.3205,
        fairnessScore: 80.305,
        travelScore: 90.0964,
        commercialScore: 100,
        transitCompatibilityScore: 16,
        originDistances: [6096, 2157],
        transitTimeProfile: {
          hasAllEstimates: true,
          averageMinutes: 12.1,
          minMinutes: 7.2,
          maxMinutes: 17,
          maxTransferCount: 1,
          items: [
            { originName: '서울역', minutes: 17, transfers: 1 },
            { originName: '강남역', minutes: 7.2, transfers: 0 },
          ],
        },
      },
      {
        name: '용산역',
        meetingScore: 113.77212,
        fairScore: 82.248154,
        centerScore: 86.1715,
        fairnessScore: 81.125,
        travelScore: 88.7356,
        commercialScore: 100,
        transitCompatibilityScore: 16,
        originDistances: [2806, 6581],
        transitTimeProfile: {
          hasAllEstimates: true,
          averageMinutes: 23,
          minMinutes: 19.2,
          maxMinutes: 26.9,
          maxTransferCount: 2,
          items: [
            { originName: '서울역', minutes: 19.2, transfers: 0 },
            { originName: '강남역', minutes: 26.9, transfers: 2 },
          ],
        },
      },
      {
        name: '한남역',
        meetingScore: 100.87188,
        fairScore: 90.304386,
        centerScore: 95.8015,
        fairnessScore: 97.275,
        travelScore: 90.0844,
        commercialScore: 100,
        transitCompatibilityScore: 12,
        originDistances: [4404, 3859],
        transitTimeProfile: {
          hasAllEstimates: true,
          averageMinutes: 19.5,
          minMinutes: 16,
          maxMinutes: 23,
          maxTransferCount: 2,
          items: [
            { originName: '서울역', minutes: 16, transfers: 1 },
            { originName: '강남역', minutes: 23, transfers: 2 },
          ],
        },
      },
      {
        name: '옥수역',
        meetingScore: 91.1,
        fairScore: 87.40331,
        centerScore: 89.5645,
        fairnessScore: 97.16,
        travelScore: 88.84,
        commercialScore: 100,
        transitCompatibilityScore: 12,
        originDistances: [4366, 4934],
        transitTimeProfile: {
          hasAllEstimates: true,
          averageMinutes: 14.3,
          minMinutes: 13,
          maxMinutes: 15.5,
          maxTransferCount: 1,
          items: [
            { originName: '서울역', minutes: 13, transfers: 1 },
            { originName: '강남역', minutes: 15.5, transfers: 1 },
          ],
        },
      },
      {
        name: '이태원역',
        meetingScore: 98.653,
        fairScore: 85.18703,
        centerScore: 95.4685,
        fairnessScore: 90.205,
        travelScore: 90.31,
        commercialScore: 100,
        transitCompatibilityScore: 12,
        originDistances: [3058, 5017],
        transitTimeProfile: {
          hasAllEstimates: true,
          averageMinutes: 18.8,
          minMinutes: 10.8,
          maxMinutes: 26.7,
          maxTransferCount: 2,
          items: [
            { originName: '서울역', minutes: 10.8, transfers: 1 },
            { originName: '강남역', minutes: 26.7, transfers: 2 },
          ],
        },
      },
    ],
    transitRoutes: [
      {
        minutes: 24,
        transfers: 1,
        distanceMeters: 7800,
        departureStation: '서울',
        arrivalStation: '왕십리',
        routeSteps: [
          { station: '서울', line: '1호선', transfer: false },
          { station: '동묘앞', line: '1호선', transfer: false },
          { station: '왕십리', line: '2호선', transfer: true },
        ],
      },
      {
        minutes: 32,
        transfers: 0,
        distanceMeters: 14300,
        departureStation: '강남',
        arrivalStation: '왕십리',
        routeSteps: [
          { station: '강남', line: '2호선', transfer: false },
          { station: '왕십리', line: '2호선', transfer: false },
        ],
      },
    ],
    nearbyPlaces: [
      {
        id: 'place-cafe-1',
        name: '픽스처 카페 첫 번째',
        address: '서울 용산구 테스트로 1',
        distance: 84,
        lat: 37.5301,
        lng: 126.9651,
      },
      {
        id: 'place-cafe-2',
        name: '픽스처 카페 두 번째',
        address: '서울 용산구 테스트로 2',
        distance: 163,
        lat: 37.5305,
        lng: 126.9658,
      },
      {
        id: 'place-cafe-3',
        name: '픽스처 카페 세 번째',
        address: '서울 용산구 테스트동 3',
        distance: 241,
        lat: 37.531,
        lng: 126.9662,
      },
    ],
  },
}

export function installRecommendationApiFixture(fixture = recommendationRegressionFixture) {
  const requests = []

  globalThis.window = {
    kakao: {
      maps: {
        services: {
          SortBy: {
            DISTANCE: 'distance',
          },
        },
      },
    },
    localStorage: createMemoryStorage(),
    setTimeout,
    clearTimeout,
  }

  globalThis.fetch = async (input) => {
    const url = new URL(String(input), 'https://fixture.mannayeok.test')
    requests.push(`${url.pathname}?${url.searchParams.toString()}`)

    if (url.pathname === '/api/transit/routes') {
      const departure = url.searchParams.get('departure')
      const route = fixture.transitRoutesByDeparture[departure]
      if (!route) return jsonResponse({ message: '정의되지 않은 지하철 fixture 요청' }, 500)

      return jsonResponse(route)
    }

    if (url.pathname !== '/api/kakao/local') {
      return jsonResponse({ message: '정의되지 않은 외부 API fixture 요청' }, 500)
    }

    const type = url.searchParams.get('type')
    const categoryCode = url.searchParams.get('category_group_code')
    const radius = Number(url.searchParams.get('radius'))

    if (type === 'category' && categoryCode === 'SW8') {
      return jsonResponse({ documents: fixture.stationDocuments, meta: { total_count: fixture.stationDocuments.length } })
    }

    if (type === 'category' && radius === 600 && categoryCode in fixture.commercialCounts) {
      return jsonResponse({ documents: [], meta: { total_count: fixture.commercialCounts[categoryCode] } })
    }

    if (type === 'category' && radius === 1000 && categoryCode === 'CE7') {
      return jsonResponse({ documents: fixture.nearbyPlaces, meta: { total_count: fixture.nearbyPlaces.length } })
    }

    return jsonResponse({ message: `정의되지 않은 Kakao fixture 요청: ${url.search}` }, 500)
  }

  return requests
}

function createMemoryStorage() {
  const values = new Map()

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
    clear() {
      values.clear()
    },
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
