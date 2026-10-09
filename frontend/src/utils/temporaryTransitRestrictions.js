import { getStationLines } from '../data/subwayStationLines'
import { normalizeStationName } from '../services/transitApi'

const TEMPORARILY_UNAVAILABLE_ORIGIN_STATIONS = [
  {
    stationName: '덕계',
    message: '공공데이터 제공 문제로 덕계역 출발 경로 조회가 일시 제한돼요.',
    suggestion: '양주역 또는 덕정역을 선택해주세요.',
  },
]

export function getTemporaryOriginRestriction(origin) {
  if (!origin) return null

  const stationNames = []
  if (origin.nearbyStationName) stationNames.push(origin.nearbyStationName)

  const directStationName = origin.routeName || origin.address || ''
  if (directStationName && getStationLines(directStationName).length > 0) {
    stationNames.push(directStationName)
  }

  const normalizedStationNames = stationNames.map(normalizeStationName)
  return (
    TEMPORARILY_UNAVAILABLE_ORIGIN_STATIONS.find((restriction) =>
      normalizedStationNames.includes(restriction.stationName),
    ) || null
  )
}

