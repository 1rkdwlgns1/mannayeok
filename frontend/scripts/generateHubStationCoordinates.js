/* global process */

import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const recommenderPath = path.join(rootDir, 'src', 'services', 'meetingRecommender.js')
const aliasPath = path.join(rootDir, 'src', 'data', 'stationAlias.json')
const outputPath = path.join(rootDir, 'src', 'data', 'hubStationCoordinates.json')
const failedPath = path.join(rootDir, 'src', 'data', 'failedHubStations.json')

const KAKAO_LOCAL_KEYWORD_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json'
const REQUEST_DELAY_MS = 120

loadEnvFile(path.join(rootDir, '.env.local'))
loadEnvFile(path.join(rootDir, '.env'))

const restApiKey = process.env.KAKAO_REST_API_KEY || process.env.VITE_KAKAO_REST_API_KEY

if (!restApiKey) {
  console.error('KAKAO_REST_API_KEY or VITE_KAKAO_REST_API_KEY is required.')
  process.exit(1)
}

const stationScoreDb = readStationScoreDb()
const aliases = readJson(aliasPath, {})
const existingCoordinates = readJson(outputPath, {})
const stationNames = Object.keys(stationScoreDb)
const coordinates = { ...existingCoordinates }
const failedStations = []

for (const stationName of stationNames) {
  if (hasValidCoordinate(coordinates[stationName])) {
    continue
  }

  const searchKeyword = aliases[stationName] || stationName

  try {
    const station = await searchStation(searchKeyword)

    if (!station) {
      failedStations.push({
        stationName,
        searchKeyword,
        reason: 'NO_STATION_RESULT',
      })
      await delay(REQUEST_DELAY_MS)
      continue
    }

    coordinates[stationName] = {
      id: station.id,
      name: station.place_name,
      searchKeyword,
      address: station.road_address_name || station.address_name || '',
      lat: Number(station.y),
      lng: Number(station.x),
    }

    console.log(`OK ${stationName} -> ${station.place_name}`)
  } catch (error) {
    failedStations.push({
      stationName,
      searchKeyword,
      reason: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    })
  }

  await delay(REQUEST_DELAY_MS)
}

writeJson(outputPath, sortObjectByKey(coordinates))
writeJson(failedPath, failedStations)

console.log(`Generated ${Object.keys(coordinates).length}/${stationNames.length} hub station coordinates.`)
console.log(`Failed ${failedStations.length} station(s).`)

function readStationScoreDb() {
  const source = fs.readFileSync(recommenderPath, 'utf8')
  const match = source.match(/export const STATION_SCORE_DB = (\{[\s\S]*?\n\})\n\nexport const MEETING_HUB_STATIONS/)

  if (!match) {
    throw new Error('Could not find STATION_SCORE_DB in meetingRecommender.js')
  }

  return vm.runInNewContext(`(${match[1]})`, {})
}

async function searchStation(keyword) {
  const params = new URLSearchParams({
    query: keyword,
    size: '15',
  })

  const response = await fetch(`${KAKAO_LOCAL_KEYWORD_URL}?${params.toString()}`, {
    headers: {
      Authorization: `KakaoAK ${restApiKey}`,
    },
  })

  if (!response.ok) {
    throw new Error(`KAKAO_${response.status}`)
  }

  const data = await response.json()
  const documents = Array.isArray(data.documents) ? data.documents : []
  const normalizedKeyword = normalizeStationName(keyword)

  return (
    documents.find((place) => place.category_group_code === 'SW8' && normalizeStationName(place.place_name) === normalizedKeyword) ||
    documents.find((place) => place.category_group_code === 'SW8') ||
    documents.find((place) => normalizeStationName(place.place_name).includes(normalizedKeyword)) ||
    null
  )
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

function hasValidCoordinate(station) {
  return Number.isFinite(station?.lat) && Number.isFinite(station?.lng)
}

function sortObjectByKey(value) {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'ko')))
}

function normalizeStationName(name) {
  const normalizedName = String(name || '')
    .replace(/\s+/g, '')
    .trim()

  if (!normalizedName) return ''
  return normalizedName.endsWith('역') ? normalizedName : `${normalizedName}역`
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
