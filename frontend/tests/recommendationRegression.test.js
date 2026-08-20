import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

import {
  installRecommendationApiFixture,
  recommendationRegressionFixture,
} from './fixtures/recommendationRegression.fixture.js'

const SCORE_TOLERANCE = 1e-6

let vite
let kakaoApi
let transitApi
let requests

before(async () => {
  requests = installRecommendationApiFixture()
  vite = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })
  kakaoApi = await vite.ssrLoadModule('/src/services/kakaoApi.js')
  transitApi = await vite.ssrLoadModule('/src/services/transitApi.js')
})

after(async () => {
  await vite?.close()
  delete globalThis.fetch
  delete globalThis.window
})

test('고정된 외부 API 응답에서 추천 결과 전체가 유지된다', async () => {
  const fixture = recommendationRegressionFixture
  const result = await kakaoApi.searchRecommendedStations(fixture.center, fixture.origins, 4)

  assert.deepEqual(
    result.meetingStations.map((station) => station.name),
    fixture.expected.meetingStationNames,
    '추천 후보역 목록 또는 순서가 변경되었습니다.',
  )
  assert.deepEqual(
    result.fairStations.map((station) => station.name),
    fixture.expected.fairStationNames,
    '공평 후보역 목록 또는 순서가 변경되었습니다.',
  )
  assert.deepEqual(result.meetingStations.map((station) => station.rank), [1, 2, 3, 4])
  assert.deepEqual(result.fairStations.map((station) => station.rank), [1, 2, 3, 4])
  assert.equal(result.meetingStations[0].name, fixture.expected.primaryStationName)

  fixture.expected.stationEvaluations.forEach((expectedStation) => {
    const station = [...result.meetingStations, ...result.fairStations]
      .find((candidate) => candidate.name === expectedStation.name)

    assert.ok(station, `${expectedStation.name} 평가 결과가 없습니다.`)
    assertClose(station.meetingScore, expectedStation.meetingScore, `${station.name}.meetingScore`)
    assertClose(station.fairScore, expectedStation.fairScore, `${station.name}.fairScore`)
    assertClose(station.centerScore, expectedStation.centerScore, `${station.name}.centerScore`)
    assertClose(station.fairnessScore, expectedStation.fairnessScore, `${station.name}.fairnessScore`)
    assertClose(station.travelScore, expectedStation.travelScore, `${station.name}.travelScore`)
    assertClose(station.commercialScore, expectedStation.commercialScore, `${station.name}.commercialScore`)
    assertClose(
      station.transitCompatibilityScore,
      expectedStation.transitCompatibilityScore,
      `${station.name}.transitCompatibilityScore`,
    )
    assertNumberArrayClose(
      station.originDistances,
      expectedStation.originDistances,
      `${station.name}.originDistances`,
    )
    assert.deepEqual(
      projectTransitTimeProfile(station.transitTimeProfile),
      expectedStation.transitTimeProfile,
    )
  })

  const primaryStation = result.meetingStations[0]
  const transitRoutes = await Promise.all(
    fixture.origins.map((origin) =>
      transitApi.fetchTransitRoute(origin.nearbyStationName, primaryStation.name),
    ),
  )
  assert.deepEqual(transitRoutes, fixture.expected.transitRoutes)

  const places = await kakaoApi.searchNearbyPlaces(primaryStation, 'cafe')
  assert.deepEqual(places, fixture.expected.nearbyPlaces)

  assert.ok(requests.some((request) => request.startsWith('/api/kakao/local?')))
  assert.equal(requests.filter((request) => request.startsWith('/api/transit/routes?')).length, 2)
})

test('카카오 지하철 검색 결과의 노선 접미사를 역 코드 조회용 이름에서 제거한다', () => {
  assert.equal(transitApi.normalizeStationName('평내호평역 경춘선'), '평내호평')
  assert.equal(transitApi.normalizeStationName('덕정역 1호선'), '덕정')
  assert.equal(transitApi.normalizeStationName('판교역 신분당선'), '판교')
  assert.equal(transitApi.normalizeStationName('서울역 GTX-A'), '서울')
  assert.equal(transitApi.normalizeStationName('계양역 인천선'), '계양')
  assert.equal(transitApi.normalizeStationName('홍대입구역 경의·중앙선'), '홍대입구')
  assert.equal(transitApi.normalizeStationName('강남역'), '강남')
})

function assertClose(actual, expected, label) {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= SCORE_TOLERANCE,
    `${label}: expected ${expected} ± ${SCORE_TOLERANCE}, actual ${actual}`,
  )
}

function assertNumberArrayClose(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label}.length`)
  actual.forEach((value, index) => assertClose(value, expected[index], `${label}[${index}]`))
}

function projectTransitTimeProfile(profile) {
  return {
    hasAllEstimates: profile.hasAllEstimates,
    averageMinutes: profile.averageMinutes,
    minMinutes: profile.minMinutes,
    maxMinutes: profile.maxMinutes,
    maxTransferCount: profile.maxTransferCount,
    items: profile.items.map(({ originName, minutes, transfers }) => ({
      originName,
      minutes,
      transfers,
    })),
  }
}
