import { getStationLines } from '../data/subwayStationLines'
import { getMinimumLineTransfers } from '../data/subwayRouteGraph'

export function getTransitCompatibilityScore(origins, stationName) {
  const stationLines = getStationLines(stationName)
  const originLineSets = origins.map(getOriginLines).filter((lines) => lines.length > 0)

  if (!stationLines.length || !originLineSets.length) return 0

  const totalScore = originLineSets.reduce(
    (score, originLines) => score + getLineCompatibilityScore(originLines, stationLines),
    0,
  )

  return clamp(totalScore / originLineSets.length, -24, 20)
}

export function getOriginLines(origin) {
  if (origin.transitLines?.length) return origin.transitLines

  return [
    ...new Set([
      ...getStationLines(origin.routeName),
      ...getStationLines(origin.address),
      ...getStationLines(origin.query),
      ...getStationLines(origin.nearbyStationName),
    ]),
  ]
}

function getLineCompatibilityScore(originLines, stationLines) {
  const hasDirectLine = originLines.some((line) => stationLines.includes(line))
  const minimumTransfers = getMinimumLineTransfers(originLines, stationLines)

  if (minimumTransfers === 0 || hasDirectLine) return 20
  if (minimumTransfers === 1) return 12
  if (minimumTransfers === 2) return 2
  if (minimumTransfers >= 3) return -12
  if (hasTransferFriendlyLine(originLines, stationLines)) return 8
  if (stationLines.length >= 3) return 2

  return -16
}

function hasTransferFriendlyLine(originLines, stationLines) {
  return originLines.some((originLine) =>
    stationLines.some((stationLine) => getTransferFriendlyLines(originLine).includes(stationLine)),
  )
}

function getTransferFriendlyLines(line) {
  const transferHints = {
    '1호선': ['2호선', '4호선', '7호선', '경의중앙선'],
    '2호선': ['1호선', '3호선', '4호선', '5호선', '6호선', '7호선', '8호선', '9호선'],
    '3호선': ['2호선', '5호선', '7호선'],
    '4호선': ['1호선', '2호선', '7호선'],
    '5호선': ['2호선', '3호선', '7호선', '8호선', '9호선'],
    '6호선': ['2호선', '3호선', '5호선'],
    '7호선': ['1호선', '2호선', '3호선', '4호선', '5호선'],
    '8호선': ['2호선', '5호선'],
    '9호선': ['2호선', '5호선'],
    경의중앙선: ['1호선', '2호선', '5호선', '6호선', '공항철도', '수인분당선'],
    수인분당선: ['1호선', '2호선', '3호선', '8호선', '9호선', '경의중앙선', '신분당선'],
    신분당선: ['2호선', '3호선', '9호선', '수인분당선', '경강선'],
    공항철도: ['1호선', '2호선', '5호선', '6호선', '9호선', '경의중앙선', '김포골드라인'],
    김포골드라인: ['5호선', '9호선', '공항철도'],
    인천1호선: ['1호선', '7호선', '수인분당선', '공항철도', '인천2호선'],
    인천2호선: ['공항철도', '인천1호선'],
    의정부경전철: ['1호선', '7호선'],
    우이신설선: ['4호선', '6호선'],
    신림선: ['2호선', '7호선', '9호선'],
    경강선: ['신분당선', '수인분당선'],
  }

  return transferHints[line] || []
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
