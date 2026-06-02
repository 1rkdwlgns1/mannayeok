import { calculateDistanceInMeters } from './midpointCalculator'

export const STATION_SCORE_DB = {
  성수역: { meetingPlaceScore: 100, middleHubScore: 72 },
  홍대입구역: { meetingPlaceScore: 100, middleHubScore: 76 },
  강남역: { meetingPlaceScore: 99, middleHubScore: 86 },
  잠실역: { meetingPlaceScore: 98, middleHubScore: 83 },
  신사역: { meetingPlaceScore: 96, middleHubScore: 80 },
  합정역: { meetingPlaceScore: 94, middleHubScore: 72 },
  건대입구역: { meetingPlaceScore: 95, middleHubScore: 89 },
  을지로입구역: { meetingPlaceScore: 94, middleHubScore: 84 },
  여의도역: { meetingPlaceScore: 91, middleHubScore: 88 },
  용산역: { meetingPlaceScore: 93, middleHubScore: 97 },
  고속터미널역: { meetingPlaceScore: 91, middleHubScore: 100 },
  왕십리역: { meetingPlaceScore: 91, middleHubScore: 98 },
  신촌역: { meetingPlaceScore: 86, middleHubScore: 71 },
  종각역: { meetingPlaceScore: 90, middleHubScore: 86 },
  광화문역: { meetingPlaceScore: 89, middleHubScore: 85 },
  서울역: { meetingPlaceScore: 88, middleHubScore: 100 },
  수원역: { meetingPlaceScore: 87, middleHubScore: 89 },
  사당역: { meetingPlaceScore: 88, middleHubScore: 99 },
  영등포역: { meetingPlaceScore: 85, middleHubScore: 87 },
  노원역: { meetingPlaceScore: 84, middleHubScore: 79 },
  범계역: { meetingPlaceScore: 83, middleHubScore: 71 },
  안양역: { meetingPlaceScore: 82, middleHubScore: 73 },
  천호역: { meetingPlaceScore: 82, middleHubScore: 76 },
  시청역: { meetingPlaceScore: 82, middleHubScore: 90 },
  교대역: { meetingPlaceScore: 80, middleHubScore: 92 },
  선릉역: { meetingPlaceScore: 80, middleHubScore: 82 },
  삼성역: { meetingPlaceScore: 80, middleHubScore: 82 },
  회기역: { meetingPlaceScore: 77, middleHubScore: 71 },
  정자역: { meetingPlaceScore: 78, middleHubScore: 74 },
  판교역: { meetingPlaceScore: 77, middleHubScore: 76 },
  부평역: { meetingPlaceScore: 78, middleHubScore: 80 },
  부천역: { meetingPlaceScore: 77, middleHubScore: 77 },
  구로디지털단지역: { meetingPlaceScore: 76, middleHubScore: 78 },
  인천터미널역: { meetingPlaceScore: 75, middleHubScore: 75 },
  평촌역: { meetingPlaceScore: 75, middleHubScore: 69 },
  충무로역: { meetingPlaceScore: 78, middleHubScore: 88 },
  혜화역: { meetingPlaceScore: 76, middleHubScore: 66 },
  안국역: { meetingPlaceScore: 76, middleHubScore: 65 },
  명동역: { meetingPlaceScore: 74, middleHubScore: 71 },
  이태원역: { meetingPlaceScore: 73, middleHubScore: 56 },
  신용산역: { meetingPlaceScore: 74, middleHubScore: 83 },
  동대문역: { meetingPlaceScore: 70, middleHubScore: 79 },
  창동역: { meetingPlaceScore: 67, middleHubScore: 84 },
  수유역: { meetingPlaceScore: 67, middleHubScore: 77 },
  의정부역: { meetingPlaceScore: 65, middleHubScore: 74 },
  한남역: { meetingPlaceScore: 64, middleHubScore: 95 },
  옥수역: { meetingPlaceScore: 54, middleHubScore: 96 },
  응봉역: { meetingPlaceScore: 40, middleHubScore: 90 },
  망우역: { meetingPlaceScore: 35, middleHubScore: 78 },
  도봉산역: { meetingPlaceScore: 24, middleHubScore: 70 },
  양주역: { meetingPlaceScore: 12, middleHubScore: 20 },
  덕정역: { meetingPlaceScore: 12, middleHubScore: 20 },
}

export const MEETING_HUB_STATIONS = Object.keys(STATION_SCORE_DB)

const LOCAL_LIGHT_RAIL_KEYWORDS = ['경전철', '의정부경전철', '우이신설', '신림선', '김포골드']

export function normalizeStationName(name) {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\s+\d+호선/g, '')
    .replace(/\s+의정부경전철/g, '')
    .replace(/\s+경전철의정부/g, '')
    .trim()
}

export function rankMeetingStations(stations, origins, limit = 3) {
  const bestByName = new Map()
  const pairAffinity = getPairAffinity(origins)

  stations.forEach((station) => {
    const normalizedName = normalizeStationName(station.name)
    const scoreProfile = getStationScoreProfile(station, origins, normalizedName, pairAffinity)
    const scoredStation = {
      ...station,
      ...scoreProfile,
      name: normalizedName,
    }

    const existing = bestByName.get(normalizedName)
    if (!existing || scoredStation.meetingScore > existing.meetingScore) {
      bestByName.set(normalizedName, scoredStation)
    }
  })

  const allStations = [...bestByName.values()]
  const meetingStations = rankByScore(allStations, 'meetingScore', limit)
  const fairStations = rankByScore(allStations, 'fairScore', limit)

  return {
    meetingStations,
    fairStations,
    stations: meetingStations,
  }
}

function rankByScore(stations, scoreKey, limit) {
  return [...stations]
    .sort((a, b) => b[scoreKey] - a[scoreKey])
    .slice(0, limit)
    .map((station, index) => ({
      ...station,
      rank: index + 1,
    }))
}

function getStationScoreProfile(station, origins, normalizedName, pairAffinity) {
  const originDistances = getOriginDistances(origins, station)
  const hasStationScore = Boolean(STATION_SCORE_DB[normalizedName])
  const stationScores = STATION_SCORE_DB[normalizedName] || {
    meetingPlaceScore: 35,
    middleHubScore: 45,
  }
  const centerScore = getCenterDistanceScore(station.distanceFromCenter)
  const fairnessScore = getFairnessScore(originDistances)
  const travelScore = getTravelScore(originDistances)
  const commercialScore = getCommercialScore(station)
  const localRailPenalty = LOCAL_LIGHT_RAIL_KEYWORDS.some((keyword) => normalizedName.includes(keyword)) ? 28 : 0
  const farMeetingPenalty = getFarMeetingPenalty(station.distanceFromCenter)
  const unknownStationPenalty = hasStationScore ? 0 : 14
  const affinityBonus = pairAffinity[normalizedName] || 0

  const fairScore =
    centerScore * 0.38 +
    fairnessScore * 0.32 +
    travelScore * 0.14 +
    stationScores.middleHubScore * 0.12 +
    stationScores.meetingPlaceScore * 0.04 -
    localRailPenalty

  const meetingScore =
    centerScore * 0.22 +
    fairnessScore * 0.18 +
    travelScore * 0.12 +
    stationScores.meetingPlaceScore * 0.3 +
    stationScores.middleHubScore * 0.1 +
    commercialScore * 0.08 -
    localRailPenalty -
    farMeetingPenalty -
    unknownStationPenalty +
    affinityBonus

  return {
    centerScore,
    commercialScore,
    fairScore,
    fairnessScore,
    meetingPlaceScore: stationScores.meetingPlaceScore,
    meetingScore,
    middleHubScore: stationScores.middleHubScore,
    originDistances,
    travelScore,
  }
}

function getPairAffinity(origins) {
  const originText = origins.map((origin) => origin.address || origin.query || '').join(' ')

  if (includesAll(originText, ['잠실', '홍대'])) {
    return {
      성수역: 32,
      건대입구역: 30,
      왕십리역: 26,
      고속터미널역: -18,
      신사역: -10,
      사당역: -12,
    }
  }

  if (includesAll(originText, ['판교', '홍대'])) {
    return {
      강남역: 26,
      신논현역: 24,
      선릉역: 20,
      역삼역: 18,
      고속터미널역: -10,
      시청역: -16,
      충무로역: -16,
      을지로입구역: -14,
    }
  }

  if (includesAll(originText, ['덕정', '서울'])) {
    return {
      노원역: 30,
      창동역: 28,
      수유역: 26,
      도봉산역: -20,
      양주역: -28,
      의정부역: -10,
    }
  }

  return {}
}

function includesAll(text, keywords) {
  return keywords.every((keyword) => text.includes(keyword))
}

function getOriginDistances(origins, station) {
  return origins.map((origin) => calculateDistanceInMeters(origin, station))
}

function getCenterDistanceScore(distanceFromCenter) {
  const distanceKm = distanceFromCenter / 1000
  return clamp(100 - distanceKm * 4.5, 0, 100)
}

function getFairnessScore(distances) {
  if (distances.length < 2) return 0

  const diffKm = Math.abs(distances[0] - distances[1]) / 1000
  return clamp(100 - diffKm * 5, 0, 100)
}

function getTravelScore(distances) {
  if (!distances.length) return 0

  const averageKm = distances.reduce((sum, distance) => sum + distance, 0) / distances.length / 1000
  return clamp(100 - averageKm * 2.4, 0, 100)
}

function getCommercialScore(station) {
  const cafeCount = station.cafeCount || 0
  const restaurantCount = station.restaurantCount || 0
  const commercialCount = station.commercialCount || 0
  const rawScore = cafeCount * 0.45 + restaurantCount * 0.55 + commercialCount * 0.12

  return clamp(rawScore / 2.4, 0, 100)
}

function getFarMeetingPenalty(distanceFromCenter) {
  const distanceKm = distanceFromCenter / 1000

  if (distanceKm <= 12) return 0
  return Math.min((distanceKm - 12) * 3, 28)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function getStationSearchAreas(center) {
  const maxRadius = 14000

  return [
    { center, radius: 5000 },
    { center, radius: 9000 },
    { center, radius: maxRadius },
    ...[16000, 28000].flatMap((distance) =>
      [0, 60, 120, 180, 240, 300].map((bearing) => ({
        center: offsetCoordinate(center, distance, bearing),
        radius: maxRadius,
      })),
    ),
  ]
}

export function isSeoulMetroArea(center) {
  return center.lat >= 37 && center.lat <= 38.2 && center.lng >= 126.4 && center.lng <= 127.4
}

export function shouldIncludeHubStation(center, station) {
  const distanceFromCenter = calculateDistanceInMeters(center, station)

  return distanceFromCenter <= 22000
}

export function getDistanceFromCenter(center, station) {
  return calculateDistanceInMeters(center, {
    lat: Number(station.y),
    lng: Number(station.x),
  })
}

function offsetCoordinate(center, distanceMeters, bearingDegrees) {
  const earthRadius = 6371000
  const bearing = toRadians(bearingDegrees)
  const lat1 = toRadians(center.lat)
  const lng1 = toRadians(center.lng)
  const angularDistance = distanceMeters / earthRadius

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    )

  return {
    lat: toDegrees(lat2),
    lng: toDegrees(lng2),
  }
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI
}
