/* global process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const coordinatesPath = path.join(rootDir, 'src', 'data', 'hubStationCoordinates.json')
const outputPath = path.join(rootDir, 'src', 'data', 'hubStationCommercialMetrics.json')
const failedPath = path.join(rootDir, 'src', 'data', 'failedHubStationCommercialMetrics.json')
const csvPath = path.join(rootDir, 'src', 'data', 'hubStationCommercialMetrics.csv')
const analysisPath = path.join(rootDir, 'src', 'data', 'hubStationCommercialMetricsAnalysis.json')

const KAKAO_LOCAL_CATEGORY_URL = 'https://dapi.kakao.com/v2/local/search/category.json'
const SEARCH_RADIUS_METERS = 600
const REQUEST_CONCURRENCY = 4
const REQUEST_DELAY_MS = 120

const CATEGORY_CODES = {
  cafe: 'CE7',
  restaurant: 'FD6',
  commercial: 'CT1',
}

loadEnvFile(path.join(rootDir, '.env.local'))
loadEnvFile(path.join(rootDir, '.env'))

const restApiKey = process.env.KAKAO_REST_API_KEY || process.env.VITE_KAKAO_REST_API_KEY

if (!restApiKey) {
  console.error('KAKAO_REST_API_KEY or VITE_KAKAO_REST_API_KEY is required.')
  process.exit(1)
}

const hubStationCoordinates = readJson(coordinatesPath, {})
const stationEntries = Object.entries(hubStationCoordinates).filter(([, station]) => hasValidCoordinate(station))
const failedStations = []

const metricsEntries = await mapWithConcurrency(stationEntries, REQUEST_CONCURRENCY, async ([stationName, station]) => {
  try {
    const [cafeCount, restaurantCount, commercialCount] = await Promise.all([
      countNearbyCategory(station, CATEGORY_CODES.cafe),
      countNearbyCategory(station, CATEGORY_CODES.restaurant),
      countNearbyCategory(station, CATEGORY_CODES.commercial),
    ])
    const hotPlaceCount = cafeCount + restaurantCount + commercialCount
    const hotPlaceSignal = cafeCount * 1.2 + restaurantCount * 1.35 + commercialCount * 0.35

    console.log(`OK ${stationName}: count=${hotPlaceCount}, signal=${round(hotPlaceSignal)}`)

    return [
      stationName,
      {
        id: station.id,
        name: station.name,
        address: station.address || '',
        lat: station.lat,
        lng: station.lng,
        radius: SEARCH_RADIUS_METERS,
        cafeCount,
        restaurantCount,
        commercialCount,
        hotPlaceCount,
        hotPlaceSignal: round(hotPlaceSignal),
      },
    ]
  } catch (error) {
    failedStations.push({
      stationName,
      reason: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    })

    return null
  }
})

const metrics = sortObjectByKey(Object.fromEntries(metricsEntries.filter(Boolean)))
const analysis = createAnalysis(metrics)

writeJson(outputPath, metrics)
writeJson(failedPath, failedStations)
writeJson(analysisPath, analysis)
writeCsv(csvPath, metrics)
printAnalysis(analysis)

console.log(`Saved metrics: ${path.relative(rootDir, outputPath)}`)
console.log(`Saved CSV: ${path.relative(rootDir, csvPath)}`)
console.log(`Saved analysis: ${path.relative(rootDir, analysisPath)}`)
console.log(`Failed ${failedStations.length} station(s).`)

async function countNearbyCategory(station, categoryCode) {
  await delay(REQUEST_DELAY_MS)

  const params = new URLSearchParams({
    category_group_code: categoryCode,
    x: String(station.lng),
    y: String(station.lat),
    radius: String(SEARCH_RADIUS_METERS),
    size: '1',
  })

  const response = await fetch(`${KAKAO_LOCAL_CATEGORY_URL}?${params.toString()}`, {
    headers: {
      Authorization: `KakaoAK ${restApiKey}`,
    },
  })

  if (!response.ok) {
    throw new Error(`KAKAO_${response.status}`)
  }

  const data = await response.json()
  const documents = Array.isArray(data.documents) ? data.documents : []

  return data.meta?.total_count || documents.length
}

function createAnalysis(metrics) {
  const rows = Object.entries(metrics).map(([stationName, metric]) => ({
    stationName,
    ...metric,
  }))

  return {
    generatedAt: new Date().toISOString(),
    radius: SEARCH_RADIUS_METERS,
    stationCount: rows.length,
    hotPlaceCount: summarize(rows.map((row) => row.hotPlaceCount)),
    hotPlaceSignal: summarize(rows.map((row) => row.hotPlaceSignal)),
    top20ByHotPlaceCount: getRankedRows(rows, 'hotPlaceCount', 'desc', 20),
    bottom20ByHotPlaceCount: getRankedRows(rows, 'hotPlaceCount', 'asc', 20),
    top20ByHotPlaceSignal: getRankedRows(rows, 'hotPlaceSignal', 'desc', 20),
    bottom20ByHotPlaceSignal: getRankedRows(rows, 'hotPlaceSignal', 'asc', 20),
  }
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const total = sorted.reduce((sum, value) => sum + value, 0)

  return {
    min: round(sorted[0] || 0),
    max: round(sorted[sorted.length - 1] || 0),
    average: round(total / sorted.length || 0),
    median: round(percentile(sorted, 50)),
    p10: round(percentile(sorted, 10)),
    p25: round(percentile(sorted, 25)),
    p50: round(percentile(sorted, 50)),
    p75: round(percentile(sorted, 75)),
    p90: round(percentile(sorted, 90)),
  }
}

function percentile(sortedValues, percentileValue) {
  if (!sortedValues.length) return 0

  const index = (percentileValue / 100) * (sortedValues.length - 1)
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)

  if (lowerIndex === upperIndex) return sortedValues[lowerIndex]

  const weight = index - lowerIndex
  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight
}

function getRankedRows(rows, key, direction, limit) {
  return [...rows]
    .sort((a, b) => (direction === 'asc' ? a[key] - b[key] : b[key] - a[key]))
    .slice(0, limit)
    .map((row) => ({
      stationName: row.stationName,
      hotPlaceCount: row.hotPlaceCount,
      hotPlaceSignal: row.hotPlaceSignal,
      cafeCount: row.cafeCount,
      restaurantCount: row.restaurantCount,
      commercialCount: row.commercialCount,
    }))
}

function printAnalysis(analysis) {
  console.log('\n=== hotPlaceCount ===')
  console.table(analysis.hotPlaceCount)
  console.log('\n=== hotPlaceSignal ===')
  console.table(analysis.hotPlaceSignal)
  console.log('\n=== TOP 20 by hotPlaceSignal ===')
  console.table(analysis.top20ByHotPlaceSignal)
  console.log('\n=== BOTTOM 20 by hotPlaceSignal ===')
  console.table(analysis.bottom20ByHotPlaceSignal)
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

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) return

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) return

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  })
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function writeCsv(filePath, metrics) {
  const headers = [
    'stationName',
    'hotPlaceCount',
    'hotPlaceSignal',
    'cafeCount',
    'restaurantCount',
    'commercialCount',
    'radius',
    'lat',
    'lng',
    'name',
    'address',
  ]
  const rows = Object.entries(metrics).map(([stationName, metric]) =>
    headers.map((header) => csvCell(header === 'stationName' ? stationName : metric[header])).join(','),
  )

  fs.writeFileSync(filePath, `${headers.join(',')}\n${rows.join('\n')}\n`, 'utf8')
}

function csvCell(value) {
  const text = value === undefined || value === null ? '' : String(value)

  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function hasValidCoordinate(station) {
  return Number.isFinite(station?.lat) && Number.isFinite(station?.lng)
}

function sortObjectByKey(value) {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'ko')))
}

function round(value) {
  return Math.round(value * 100) / 100
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
