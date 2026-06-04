import { calculateDistanceInMeters } from './midpointCalculator'

export const STATION_SCORE_DB = {
  성수역: { meetingPlaceScore: 100, middleHubScore: 72 },
  홍대입구역: { meetingPlaceScore: 100, middleHubScore: 76 },
  망원역: { meetingPlaceScore: 90, middleHubScore: 62 },
  상수역: { meetingPlaceScore: 88, middleHubScore: 63 },
  연남동역: { meetingPlaceScore: 92, middleHubScore: 58 },
  이대역: { meetingPlaceScore: 80, middleHubScore: 70 },
  아현역: { meetingPlaceScore: 70, middleHubScore: 78 },
  강남역: { meetingPlaceScore: 99, middleHubScore: 86 },
  신논현역: { meetingPlaceScore: 96, middleHubScore: 84 },
  역삼역: { meetingPlaceScore: 84, middleHubScore: 82 },
  압구정역: { meetingPlaceScore: 86, middleHubScore: 72 },
  압구정로데오역: { meetingPlaceScore: 94, middleHubScore: 68 },
  청담역: { meetingPlaceScore: 80, middleHubScore: 70 },
  잠실역: { meetingPlaceScore: 98, middleHubScore: 83 },
  잠실새내역: { meetingPlaceScore: 87, middleHubScore: 71 },
  석촌역: { meetingPlaceScore: 78, middleHubScore: 76 },
  송파나루역: { meetingPlaceScore: 84, middleHubScore: 66 },
  신사역: { meetingPlaceScore: 96, middleHubScore: 80 },
  합정역: { meetingPlaceScore: 94, middleHubScore: 72 },
  문래역: { meetingPlaceScore: 84, middleHubScore: 70 },
  당산역: { meetingPlaceScore: 78, middleHubScore: 84 },
  건대입구역: { meetingPlaceScore: 99, middleHubScore: 89 },
  서울숲역: { meetingPlaceScore: 90, middleHubScore: 70 },
  뚝섬역: { meetingPlaceScore: 86, middleHubScore: 74 },
  군자역: { meetingPlaceScore: 76, middleHubScore: 82 },
  어린이대공원역: { meetingPlaceScore: 72, middleHubScore: 70 },
  을지로입구역: { meetingPlaceScore: 85, middleHubScore: 84 },
  을지로3가역: { meetingPlaceScore: 87, middleHubScore: 88 },
  을지로4가역: { meetingPlaceScore: 78, middleHubScore: 82 },
  동대문역사문화공원역: { meetingPlaceScore: 82, middleHubScore: 92 },
  동묘앞역: { meetingPlaceScore: 68, middleHubScore: 82 },
  여의도역: { meetingPlaceScore: 91, middleHubScore: 88 },
  여의나루역: { meetingPlaceScore: 86, middleHubScore: 72 },
  용산역: { meetingPlaceScore: 93, middleHubScore: 97 },
  삼각지역: { meetingPlaceScore: 82, middleHubScore: 88 },
  숙대입구역: { meetingPlaceScore: 76, middleHubScore: 76 },
  녹사평역: { meetingPlaceScore: 78, middleHubScore: 62 },
  고속터미널역: { meetingPlaceScore: 91, middleHubScore: 100 },
  왕십리역: { meetingPlaceScore: 91, middleHubScore: 98 },
  신촌역: { meetingPlaceScore: 86, middleHubScore: 71 },
  종각역: { meetingPlaceScore: 82, middleHubScore: 86 },
  광화문역: { meetingPlaceScore: 80, middleHubScore: 85 },
  서울역: { meetingPlaceScore: 88, middleHubScore: 100 },
  공덕역: { meetingPlaceScore: 82, middleHubScore: 94 },
  마포역: { meetingPlaceScore: 78, middleHubScore: 82 },
  디지털미디어시티역: { meetingPlaceScore: 78, middleHubScore: 88 },
  상암DMC역: { meetingPlaceScore: 78, middleHubScore: 82 },
  수원역: { meetingPlaceScore: 87, middleHubScore: 89 },
  광교중앙역: { meetingPlaceScore: 82, middleHubScore: 76 },
  수원시청역: { meetingPlaceScore: 84, middleHubScore: 68 },
  병점역: { meetingPlaceScore: 62, middleHubScore: 76 },
  사당역: { meetingPlaceScore: 88, middleHubScore: 99 },
  이수역: { meetingPlaceScore: 80, middleHubScore: 86 },
  낙성대역: { meetingPlaceScore: 78, middleHubScore: 66 },
  서울대입구역: { meetingPlaceScore: 84, middleHubScore: 72 },
  영등포역: { meetingPlaceScore: 85, middleHubScore: 87 },
  신도림역: { meetingPlaceScore: 78, middleHubScore: 96 },
  문정역: { meetingPlaceScore: 76, middleHubScore: 74 },
  가산디지털단지역: { meetingPlaceScore: 76, middleHubScore: 84 },
  노원역: { meetingPlaceScore: 88, middleHubScore: 84 },
  미아사거리역: { meetingPlaceScore: 78, middleHubScore: 74 },
  석계역: { meetingPlaceScore: 68, middleHubScore: 84 },
  태릉입구역: { meetingPlaceScore: 66, middleHubScore: 80 },
  범계역: { meetingPlaceScore: 83, middleHubScore: 71 },
  안양역: { meetingPlaceScore: 82, middleHubScore: 73 },
  금정역: { meetingPlaceScore: 72, middleHubScore: 90 },
  산본역: { meetingPlaceScore: 78, middleHubScore: 70 },
  천호역: { meetingPlaceScore: 82, middleHubScore: 76 },
  길동역: { meetingPlaceScore: 68, middleHubScore: 68 },
  둔촌동역: { meetingPlaceScore: 62, middleHubScore: 70 },
  시청역: { meetingPlaceScore: 82, middleHubScore: 90 },
  교대역: { meetingPlaceScore: 80, middleHubScore: 92 },
  선릉역: { meetingPlaceScore: 80, middleHubScore: 82 },
  삼성역: { meetingPlaceScore: 80, middleHubScore: 82 },
  회기역: { meetingPlaceScore: 82, middleHubScore: 77 },
  정자역: { meetingPlaceScore: 78, middleHubScore: 74 },
  서현역: { meetingPlaceScore: 86, middleHubScore: 78 },
  야탑역: { meetingPlaceScore: 78, middleHubScore: 80 },
  미금역: { meetingPlaceScore: 74, middleHubScore: 76 },
  판교역: { meetingPlaceScore: 77, middleHubScore: 76 },
  부평역: { meetingPlaceScore: 78, middleHubScore: 80 },
  예술회관역: { meetingPlaceScore: 82, middleHubScore: 70 },
  주안역: { meetingPlaceScore: 72, middleHubScore: 78 },
  송도달빛축제공원역: { meetingPlaceScore: 78, middleHubScore: 64 },
  인천대입구역: { meetingPlaceScore: 76, middleHubScore: 68 },
  부천역: { meetingPlaceScore: 77, middleHubScore: 77 },
  상동역: { meetingPlaceScore: 78, middleHubScore: 70 },
  송내역: { meetingPlaceScore: 72, middleHubScore: 78 },
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
  창동역: { meetingPlaceScore: 74, middleHubScore: 88 },
  수유역: { meetingPlaceScore: 74, middleHubScore: 79 },
  의정부역: { meetingPlaceScore: 78, middleHubScore: 82 },
  회룡역: { meetingPlaceScore: 58, middleHubScore: 82 },
  한남역: { meetingPlaceScore: 64, middleHubScore: 95 },
  옥수역: { meetingPlaceScore: 54, middleHubScore: 96 },
  응봉역: { meetingPlaceScore: 40, middleHubScore: 90 },
  망우역: { meetingPlaceScore: 42, middleHubScore: 78 },
  도봉산역: { meetingPlaceScore: 42, middleHubScore: 75 },
  연천역: { meetingPlaceScore: 5, middleHubScore: 5 },
전곡역: { meetingPlaceScore: 6, middleHubScore: 6 },
청산역: { meetingPlaceScore: 5, middleHubScore: 5 },
소요산역: { meetingPlaceScore: 5, middleHubScore: 8 },
  동두천중앙역: { meetingPlaceScore: 28, middleHubScore: 45 },
  동두천역: { meetingPlaceScore: 18, middleHubScore: 28 },
  보산역: { meetingPlaceScore: 22, middleHubScore: 34 },
  지행역: { meetingPlaceScore: 42, middleHubScore: 58 },
  덕계역: { meetingPlaceScore: 24, middleHubScore: 48 },
  양주역: { meetingPlaceScore: 15, middleHubScore: 30 },
  덕정역: { meetingPlaceScore: 20, middleHubScore: 36 },
}

export const MEETING_HUB_STATIONS = Object.keys(STATION_SCORE_DB)

const LOCAL_LIGHT_RAIL_KEYWORDS = ['경전철', '의정부경전철', '우이신설', '신림선', '김포골드']
const NORTHERN_REMOTE_KEYWORDS = ['연천', '전곡', '청산', '소요산']
const NORTHERN_SEOUL_KEYWORDS = ['망월사', '도봉산', '방학', '창동', '노원', '수유']

export function normalizeStationName(name) {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\s+\d+호선/g, '')
    .replace(/\s+의정부경전철/g, '')
    .replace(/\s+경전철의정부/g, '')
    .trim()
}

export function getContextualHubStationKeywords(origins) {
  const originText = origins.map((origin) => origin.address || origin.query || '').join(' ')
  const hasNorthernRemoteOrigin = includesAny(originText, NORTHERN_REMOTE_KEYWORDS)

  if (!hasNorthernRemoteOrigin) return []

  if (includesAny(originText, NORTHERN_SEOUL_KEYWORDS)) {
    return ['의정부역', '도봉산역', '창동역', '노원역', '회룡역']
  }

  return ['의정부역', '노원역', '창동역', '수유역', '회룡역', '지행역']
}


export function rankMeetingStations(stations, origins, limit = 3) {
  if (origins.length >= 3) {
    return rankMultiPersonStations(stations, origins, limit)
  }
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
function rankMultiPersonStations(stations, origins, limit) {
  const bestByName = new Map()
  const pairAffinity = getPairAffinity(origins)

  stations.forEach((station) => {
    const normalizedName = normalizeStationName(station.name)
    const originDistances = origins.map((origin) => calculateDistanceInMeters(origin, station))
    const avgDistance = originDistances.reduce((sum, distance) => sum + distance, 0) / originDistances.length
    const centerScore = getCenterDistanceScore(station.distanceFromCenter)
    const commercialScore = getCommercialScore(station)
    const minDistance = Math.min(...originDistances)
    const maxDistance = Math.max(...originDistances)

    const fairnessScore = clamp(
      100 - ((maxDistance - minDistance) / 1000) * 2.5,
      0,
      100,
    )

    const travelScore = clamp(
      100 - (avgDistance / 1000) * 2.2,
      0,
      100,
    )

    const stationScores = STATION_SCORE_DB[normalizedName] || {
      meetingPlaceScore: 35,
      middleHubScore: 45,
    }
    const hasStationScore = Boolean(STATION_SCORE_DB[normalizedName])
    const unknownStationPenalty = hasStationScore ? 0 : 12
    const lowCommercialPenalty = getLowCommercialPenalty(station.hotPlaceCount || 0)
    const lowMeetingPlacePenalty = getLowMeetingPlacePenalty(stationScores.meetingPlaceScore)
    const affinityBonus = pairAffinity[normalizedName] || 0

    const meetingScore =
      fairnessScore * 0.20 +
      travelScore * 0.20 +
      stationScores.meetingPlaceScore * 0.35 +
      commercialScore * 0.25 -
      unknownStationPenalty -
      lowCommercialPenalty -
      lowMeetingPlacePenalty +
      affinityBonus

    const fairScore =
      fairnessScore * 0.45 +
      centerScore * 0.25 +
      travelScore * 0.2 +
      stationScores.middleHubScore * 0.1

    const scoredStation = {
      ...station,
      centerScore,
      commercialScore,
      fairScore,
      fairnessScore,
      lowCommercialPenalty,
      lowMeetingPlacePenalty,
      affinityBonus,
      unknownStationPenalty,
      meetingPlaceScore: stationScores.meetingPlaceScore,
      meetingScore,
      middleHubScore: stationScores.middleHubScore,
      name: normalizedName,
      originDistances,
      travelScore,
    }

    const existing = bestByName.get(normalizedName)

    if (
      !existing ||
      Math.max(scoredStation.meetingScore, scoredStation.fairScore) >
        Math.max(existing.meetingScore, existing.fairScore)
    ) {
      bestByName.set(normalizedName, scoredStation)
    }
  })

  const rankedStations = [...bestByName.values()]
  const meetingStations = rankByScore(rankedStations, 'meetingScore', limit)
  const fairStations = rankByScore(rankedStations, 'fairScore', limit)

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
  const routeDistance = getRouteDistance(origins)
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

  const lowCommercialPenalty = getLowCommercialPenalty(station.hotPlaceCount || 0)
  const lowMeetingPlacePenalty = getLowMeetingPlacePenalty(stationScores.meetingPlaceScore)
  const meetingWeights = getMeetingScoreWeights(routeDistance)

  const fairScore =
    centerScore * 0.38 +
    fairnessScore * 0.32 +
    travelScore * 0.14 +
    stationScores.middleHubScore * 0.08 +
    stationScores.meetingPlaceScore * 0.04 -
    localRailPenalty

  const meetingScore =
    fairnessScore * meetingWeights.fairness +
    travelScore * meetingWeights.travel +
    commercialScore * meetingWeights.commercial +
    stationScores.meetingPlaceScore * meetingWeights.meetingPlace -
    localRailPenalty -
    farMeetingPenalty -
    unknownStationPenalty -
    lowCommercialPenalty -
    lowMeetingPlacePenalty +
    affinityBonus

  return {
    centerScore,
    commercialScore,
    fairScore,
    fairnessScore,
    meetingPlaceScore: stationScores.meetingPlaceScore,
    meetingScore,
    meetingScoreWeights: meetingWeights,
    middleHubScore: stationScores.middleHubScore,
    lowCommercialPenalty,
    lowMeetingPlacePenalty,
    originDistances,
    travelScore,
  }
}

function getPairAffinity(origins) {
  const originText = origins.map((origin) => origin.address || origin.query || '').join(' ')
  const genericAffinity = getGenericPairAffinity(origins, originText)

  if (includesAny(originText, NORTHERN_REMOTE_KEYWORDS)) {
    const northernCoreBonus = {
      의정부역: 34,
      노원역: 32,
      창동역: 26,
      수유역: 20,
      회기역: 14,
      지행역: 10,
      도봉산역: 8,
      양주역: -24,
      덕계역: -18,
      덕정역: -16,
      동두천역: -18,
      동두천중앙역: -14,
      보산역: -10,
      연천역: -40,
      전곡역: -36,
      청산역: -38,
      소요산역: -34,
    }

    if (includesAny(originText, ['잠실', '강남', '건대', '성수', '왕십리', '서울'])) {
      return mergeAffinity(genericAffinity, {
        ...northernCoreBonus,
        의정부역: 40,
        노원역: 38,
        창동역: 30,
        수유역: 24,
        회기역: 18,
      })
    }

    if (includesAny(originText, NORTHERN_SEOUL_KEYWORDS)) {
      return mergeAffinity(genericAffinity, {
        ...northernCoreBonus,
        의정부역: 55,
        노원역: 30,
        창동역: 28,
        수유역: 22,
        도봉산역: 18,
        회룡역: 14,
        지행역: -8,
        동두천중앙역: -18,
      })
    }

    return mergeAffinity(genericAffinity, northernCoreBonus)
  }

  if (includesAll(originText, ['잠실', '홍대'])) {
    return mergeAffinity(genericAffinity, {
      성수역: 32,
      건대입구역: 30,
      왕십리역: 26,
      고속터미널역: -18,
      신사역: -10,
      사당역: -12,
    })
  }

  if (includesAll(originText, ['판교', '홍대'])) {
    return mergeAffinity(genericAffinity, {
      강남역: 26,
      신논현역: 24,
      선릉역: 20,
      역삼역: 18,
      고속터미널역: -10,
      시청역: -16,
      충무로역: -16,
      을지로입구역: -14,
    })
  }

  if (includesAll(originText, ['덕정', '서울'])) {
    return mergeAffinity(genericAffinity, {
      노원역: 30,
      창동역: 28,
      수유역: 26,
      도봉산역: -20,
      양주역: -28,
      의정부역: -10,
    })
  }

  if (includesAll(originText, ['홍대', '건대'])) {
  return mergeAffinity(genericAffinity, {
    성수역: 40,
    건대입구역: 35,
    왕십리역: 20,

    고속터미널역: -40,
    충무로역: -20,
    을지로입구역: -15,
  })
}

if (includesAll(originText, ['건대', '성수'])) {
  return mergeAffinity(genericAffinity, {
    성수역: 35,
    건대입구역: 35,
    왕십리역: 10,

    고속터미널역: -50,
    서울역: -30,
  })
}

if (includesAll(originText, ['홍대', '강남'])) {
  return mergeAffinity(genericAffinity, {
    용산역: 30,
    신사역: 28,
    강남역: 25,

    왕십리역: -20,
    건대입구역: -15,
  })
}

if (includesAll(originText, ['노원', '잠실'])) {
  return mergeAffinity(genericAffinity, {
    왕십리역: 35,
    성수역: 28,
    건대입구역: 25,

    면목역: -30,
    공릉역: -20,
  })
}
  return genericAffinity
}

function getGenericPairAffinity(origins, originText) {
  const routeDistance = getRouteDistance(origins)
  const affinity = {}

  if (routeDistance >= 50000) {
    addAffinity(affinity, {
      강남역: 8,
      건대입구역: 10,
      노원역: 10,
      성수역: 10,
      신촌역: 8,
      왕십리역: 10,
      용산역: 8,
      의정부역: 10,
      홍대입구역: 8,
    })
  }

  if (includesAny(originText, ['김포', '마곡', '공항', '발산'])) {
    addAffinity(affinity, {
      홍대입구역: 12,
      합정역: 12,
      망원역: 8,
      디지털미디어시티역: 8,
      여의도역: 8,
      강남역: -10,
      잠실역: -12,
    })
  }

  if (includesAny(originText, ['수원', '병점', '동탄', '광교'])) {
    addAffinity(affinity, {
      수원역: 12,
      사당역: 10,
      강남역: 10,
      판교역: 8,
      범계역: 8,
      노원역: -10,
      의정부역: -12,
    })
  }

  if (includesAny(originText, ['인천', '부평', '주안', '송도'])) {
    addAffinity(affinity, {
      부평역: 12,
      예술회관역: 10,
      인천터미널역: 8,
      홍대입구역: 8,
      영등포역: 8,
      여의도역: 8,
      잠실역: -10,
      노원역: -12,
    })
  }

  if (includesAny(originText, ['분당', '판교', '정자', '서현', '야탑'])) {
    addAffinity(affinity, {
      판교역: 12,
      서현역: 12,
      강남역: 10,
      신논현역: 8,
      사당역: 8,
      홍대입구역: -8,
      노원역: -12,
    })
  }

  return affinity
}

function mergeAffinity(base, override) {
  return Object.entries(override).reduce(
    (acc, [stationName, score]) => ({
      ...acc,
      [stationName]: (acc[stationName] || 0) + score,
    }),
    { ...base },
  )
}

function addAffinity(target, entries) {
  Object.entries(entries).forEach(([stationName, score]) => {
    target[stationName] = (target[stationName] || 0) + score
  })
}

function includesAll(text, keywords) {
  return keywords.every((keyword) => text.includes(keyword))
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword))
}

function getOriginDistances(origins, station) {
  return origins.map((origin) => calculateDistanceInMeters(origin, station))
}

function getRouteDistance(origins) {
  if (origins.length < 2) return 0

  return calculateDistanceInMeters(origins[0], origins[1])
}

function getMeetingScoreWeights(routeDistance) {
  if (routeDistance >= 50000) {
    return {
      commercial: 0.25,
      fairness: 0.1,
      meetingPlace: 0.45,
      travel: 0.2,
    }
  }

  return {
    commercial: 0.25,
    fairness: 0.2,
    meetingPlace: 0.35,
    travel: 0.2,
  }
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
  const rawScore = cafeCount * 0.75 + restaurantCount * 0.85 + commercialCount * 0.08

  return clamp(rawScore / 2.6, 0, 100)
}

function getLowCommercialPenalty(hotPlaceCount) {
  if (hotPlaceCount >= 150) return 0
  if (hotPlaceCount >= 100) return 5
  if (hotPlaceCount >= 50) return 15
  if (hotPlaceCount >= 20) return 30

  return 40
}

function getLowMeetingPlacePenalty(meetingPlaceScore) {
  if (meetingPlaceScore >= 70) return 0
  if (meetingPlaceScore >= 60) return 4
  if (meetingPlaceScore >= 50) return 10
  if (meetingPlaceScore >= 35) return 24
  if (meetingPlaceScore >= 20) return 34

  return 44
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

export function getRouteStationSearchAreas(origins) {
  if (origins.length < 2) return []

  if (origins.length === 2) {
    const [from, to] = origins
    const routeDistance = calculateDistanceInMeters(from, to)
    const radius = routeDistance > 50000 ? 10000 : 7000
    const fractions = routeDistance > 50000 ? [0.18, 0.3, 0.42, 0.5, 0.58, 0.7, 0.82] : [0.25, 0.4, 0.5, 0.6, 0.75]

    return fractions.map((fraction) => ({
      center: interpolateCoordinate(from, to, fraction),
      radius,
    }))
  }

  const center = getCoordinateCenter(origins)
  const maxRouteDistance = getMaxPairDistance(origins)
  const radius = maxRouteDistance > 50000 ? 10000 : 7000
  const fractions = maxRouteDistance > 50000 ? [0.25, 0.5, 0.75] : [0.33, 0.5, 0.67]
  const routeAreas = []

  origins.forEach((from, fromIndex) => {
    origins.slice(fromIndex + 1).forEach((to) => {
      fractions.forEach((fraction) => {
        routeAreas.push({
          center: interpolateCoordinate(from, to, fraction),
          radius,
        })
      })
    })
  })

  return [
    { center, radius },
    ...routeAreas,
  ]
}

function getCoordinateCenter(coordinates) {
  const sum = coordinates.reduce(
    (acc, current) => ({
      lat: acc.lat + current.lat,
      lng: acc.lng + current.lng,
    }),
    { lat: 0, lng: 0 },
  )

  return {
    lat: sum.lat / coordinates.length,
    lng: sum.lng / coordinates.length,
  }
}

function getMaxPairDistance(origins) {
  let maxDistance = 0

  origins.forEach((from, fromIndex) => {
    origins.slice(fromIndex + 1).forEach((to) => {
      maxDistance = Math.max(maxDistance, calculateDistanceInMeters(from, to))
    })
  })

  return maxDistance
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

function interpolateCoordinate(from, to, fraction) {
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  }
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI
}
