import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate'
import { isBlockedOrigin } from '../services/kakaoApi'

const MIN_SHARED_ORIGIN_COUNT = 2

function createResultSharePayload({
  origins,
  recommendedStations,
  fairStations,
  selectedStationId,
}) {
  const sharedRecommendedStations = recommendedStations.slice(0, 4).map(pickSharedStation)
  const sharedFairStations = fairStations.slice(0, 1).map(pickSharedStation)
  const payload = {
    origins: origins.map(pickSharedOrigin),
    recommendedStations: sharedRecommendedStations,
    fairStations: sharedFairStations,
    selectedStationId,
  }

  return { type: 'RESULT', payload: encodeSharePayload(payload) }
}

function createDefaultMeetingName(origins) {
  const names = origins.map((origin) => {
    const source = String(
      origin.nearbyStationName || origin.routeName || origin.address || '',
    ).trim()
    const stationMatch = source.match(/^(.+?역)(?:\s|$)/)
    return (stationMatch?.[1] || source.split(/[ ,]/)[0] || '출발지').replace(/역$/, '')
  })

  if (names.length > 3) {
    return `${names.slice(0, 2).join(' · ')} 외 ${names.length - 2}곳 약속`
  }
  return `${names.join(' · ')} 약속`
}

function createReferenceSharePayload({ origins, referenceMidpoint, selectedReferenceAreaId }) {
  if (!referenceMidpoint) return null
  const practicalAreas = referenceMidpoint.practicalAreas || []
  const selectedAreaIndex = Math.max(
    0,
    practicalAreas.findIndex((area) => area.id === selectedReferenceAreaId),
  )
  const compactPayload = [
    2,
    origins.map(packSharedOriginV3),
    [
      roundShareNumber(referenceMidpoint.lat, 6),
      roundShareNumber(referenceMidpoint.lng, 6),
      referenceMidpoint.regionName,
      practicalAreas.map((area) => [
        area.name,
        area.address,
        roundShareNumber(area.lat, 6),
        roundShareNumber(area.lng, 6),
        area.kind,
        roundShareNumber(area.commercialCount),
        area.regionName,
        roundShareNumber(area.distanceFromCenter),
      ]),
      selectedAreaIndex,
    ],
  ]

  return { type: 'REFERENCE', payload: encodeCompressedPayload(compactPayload) }
}

function decodeStoredSharedResult(storedResult) {
  try {
    if (storedResult?.type === 'REFERENCE') {
      return decodeSharedReference(storedResult.payload)
    }
    if (storedResult?.type === 'RESULT') {
      return decodeSharedRecommendation(storedResult.payload)
    }
    return null
  } catch {
    return null
  }
}

function decodeSharedReference(encodedPayload) {
  const payload = decodeCompressedPayload(encodedPayload)
  const origins = (payload?.[1] || []).map(unpackSharedOriginV3)
  const midpoint = payload?.[2]

  if (
    payload?.[0] !== 2 ||
    origins.length < MIN_SHARED_ORIGIN_COUNT ||
    origins.some(isBlockedOrigin) ||
    !Number.isFinite(midpoint?.[0]) ||
    !Number.isFinite(midpoint?.[1])
  ) return null

  const practicalAreas = (midpoint[3] || []).map((area, index) => ({
    id: `shared-reference-area-${index}`,
    name: area[0],
    address: area[1],
    lat: area[2],
    lng: area[3],
    kind: area[4],
    commercialCount: area[5],
    regionName: area[6] || area[1],
    distanceFromCenter: area[7],
    mapLabel: index === 0 ? '참고' : `후보 ${index + 1}`,
  }))
  const selectedAreaIndex = Math.min(
    Math.max(Number(midpoint[4]) || 0, 0),
    Math.max(practicalAreas.length - 1, 0),
  )

  return {
    origins,
    recommendedStations: [],
    fairStations: [],
    selectedStationId: null,
    referenceMidpoint: {
      id: 'reference-midpoint',
      name: '지도상 중간지점',
      mapLabel: '중간',
      lat: midpoint[0],
      lng: midpoint[1],
      regionName: midpoint[2] || '중간지점 주변',
      practicalAreas,
    },
    selectedReferenceAreaId: practicalAreas[selectedAreaIndex]?.id || null,
  }
}

function decodeSharedRecommendation(encodedPayload) {
  const payload = decodeSharePayload(encodedPayload)
  const hasValidOrigins =
    Array.isArray(payload.origins) &&
    payload.origins.length >= MIN_SHARED_ORIGIN_COUNT &&
    !payload.origins.some(isBlockedOrigin)
  const hasValidStations =
    Array.isArray(payload.recommendedStations) && payload.recommendedStations.length > 0

  return hasValidOrigins && hasValidStations ? payload : null
}

function encodeCompressedPayload(payload) {
  const compressedBytes = gzipSync(strToU8(JSON.stringify(payload)), { level: 9 })
  const binary = Array.from(compressedBytes, (byte) => String.fromCharCode(byte)).join('')

  return `z${window.btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}`
}

function decodeCompressedPayload(encodedPayload) {
  const payloadBase64 = encodedPayload.startsWith('z')
    ? encodedPayload.slice(1)
    : encodedPayload
  const base64 = payloadBase64.replaceAll('-', '+').replaceAll('_', '/')
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = window.atob(paddedBase64)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  const json = encodedPayload.startsWith('z')
    ? strFromU8(gunzipSync(bytes))
    : new TextDecoder().decode(bytes)

  return JSON.parse(json)
}

function pickSharedOrigin(origin) {
  return {
    id: origin.id,
    address: origin.address,
    routeName: origin.routeName,
    nearbyStationName: origin.nearbyStationName,
    lat: origin.lat,
    lng: origin.lng,
  }
}

function pickSharedStation(station) {
  return {
    id: station.id,
    name: station.name,
    lat: station.lat,
    lng: station.lng,
    distanceFromCenter: station.distanceFromCenter,
    hotPlaceCount: station.hotPlaceCount,
    middleHubScore: station.middleHubScore,
    fairnessScore: station.fairnessScore,
    transitCompatibilityScore: station.transitCompatibilityScore,
  }
}

function encodeSharePayload(payload) {
  const recommendedSelectionIndex = payload.recommendedStations.findIndex(
    (station) => station.id === payload.selectedStationId,
  )
  const fairSelectionIndex = payload.fairStations.findIndex(
    (station) => station.id === payload.selectedStationId,
  )
  const selection =
    recommendedSelectionIndex >= 0
      ? [0, recommendedSelectionIndex]
      : fairSelectionIndex >= 0
        ? [1, fairSelectionIndex]
        : [0, 0]
  const compactPayload = [
    4,
    payload.origins.map(packSharedOriginV3),
    payload.recommendedStations.map(packSharedStationV4),
    payload.fairStations.map(packSharedStationV4),
    selection,
  ]
  const compressedBytes = gzipSync(strToU8(JSON.stringify(compactPayload)), { level: 9 })
  const binary = Array.from(compressedBytes, (byte) => String.fromCharCode(byte)).join('')

  return `z${window.btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}`
}

function decodeSharePayload(encodedPayload) {
  const isCompressed = encodedPayload.startsWith('z')
  const payloadBase64 = isCompressed ? encodedPayload.slice(1) : encodedPayload
  const base64 = payloadBase64.replaceAll('-', '+').replaceAll('_', '/')
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = window.atob(paddedBase64)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  const json = isCompressed ? strFromU8(gunzipSync(bytes)) : new TextDecoder().decode(bytes)
  const payload = JSON.parse(json)

  if (!Array.isArray(payload)) return payload

  if (payload[0] === 4) {
    const recommendedStations = (payload[2] || []).map((station, index) =>
      unpackSharedStationV4(station, `shared-recommended-${index}`),
    )
    const fairStations = (payload[3] || []).map((station, index) =>
      unpackSharedStationV4(station, `shared-fair-${index}`),
    )
    const [selectionGroup = 0, selectionIndex = 0] = payload[4] || []
    const selectedStation =
      (selectionGroup === 1 ? fairStations : recommendedStations)[selectionIndex] ||
      recommendedStations[0]

    return {
      origins: (payload[1] || []).map(unpackSharedOriginV3),
      recommendedStations,
      fairStations,
      selectedStationId: selectedStation?.id || null,
    }
  }

  if (payload[0] === 3) {
    const recommendedStations = (payload[2] || []).map((station, index) =>
      unpackSharedStationV3(station, `shared-recommended-${index}`),
    )
    const fairStations = (payload[3] || []).map((station, index) =>
      unpackSharedStationV3(station, `shared-fair-${index}`),
    )
    const [selectionGroup = 0, selectionIndex = 0] = payload[4] || []
    const selectedStation =
      (selectionGroup === 1 ? fairStations : recommendedStations)[selectionIndex] ||
      recommendedStations[0]

    return {
      origins: (payload[1] || []).map(unpackSharedOriginV3),
      recommendedStations,
      fairStations,
      selectedStationId: selectedStation?.id || null,
    }
  }

  if (payload[0] !== 2) return payload

  return {
    origins: (payload[1] || []).map(unpackSharedOrigin),
    recommendedStations: (payload[2] || []).map(unpackSharedStation),
    fairStations: (payload[3] || []).map(unpackSharedStation),
    selectedStationId: payload[4],
  }
}

function packSharedOriginV3(origin) {
  return [
    origin.routeName || origin.address,
    roundShareNumber(origin.lat, 6),
    roundShareNumber(origin.lng, 6),
    origin.nearbyStationName || '',
  ]
}

function unpackSharedOriginV3(origin, index) {
  return {
    id: `shared-origin-${index}`,
    address: origin[0],
    routeName: origin[0],
    nearbyStationName: origin[3] || '',
    lat: origin[1],
    lng: origin[2],
  }
}

function packSharedStationV4(station) {
  return [
    station.name,
    roundShareNumber(station.lat, 6),
    roundShareNumber(station.lng, 6),
    roundShareNumber(station.distanceFromCenter),
    roundShareNumber(station.hotPlaceCount),
    roundShareNumber(station.middleHubScore),
    roundShareNumber(station.fairnessScore),
    roundShareNumber(station.transitCompatibilityScore),
  ]
}

function unpackSharedStationV4(station, id) {
  return {
    id,
    name: station[0],
    lat: station[1],
    lng: station[2],
    distanceFromCenter: station[3],
    hotPlaceCount: station[4],
    middleHubScore: station[5],
    fairnessScore: station[6],
    transitCompatibilityScore: station[7],
  }
}

function unpackSharedStationV3(station, id) {
  return {
    id,
    name: station[0],
    lat: station[1],
    lng: station[2],
    distanceFromCenter: station[3],
    hotPlaceCount: station[4],
    hotPlaceSignal: station[5],
    meetingPlaceScore: station[6],
    middleHubScore: station[7],
    fairnessScore: station[8],
    transitCompatibilityScore: station[9],
  }
}

function unpackSharedOrigin(origin) {
  return {
    id: origin[0],
    address: origin[1],
    routeName: origin[2],
    lat: origin[3],
    lng: origin[4],
  }
}

function unpackSharedStation(station) {
  return {
    id: station[0],
    name: station[1],
    lat: station[2],
    lng: station[3],
    distanceFromCenter: station[4],
    hotPlaceCount: station[5],
    hotPlaceSignal: station[6],
    meetingPlaceScore: station[7],
    middleHubScore: station[8],
    fairnessScore: station[9],
    transitCompatibilityScore: station[10],
  }
}

function roundShareNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return value ?? null

  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

export {
  createDefaultMeetingName,
  createReferenceSharePayload,
  createResultSharePayload,
  decodeSharePayload,
  decodeStoredSharedResult,
  encodeSharePayload,
}
