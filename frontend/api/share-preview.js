import { Buffer } from 'node:buffer'
import { gunzipSync } from 'node:zlib'

const API_BASE_URL = 'https://api.mannayeok.kr'
const APP_URL = 'https://mannayeok.kr'
const SHARE_IMAGE_URL = `${APP_URL}/mannayeok-share-logo.png?v=2`
const SHARE_CODE_PATTERN = /^[a-f0-9]{20}$/
const CRAWLER_PATTERN = /bot|crawler|spider|facebookexternalhit|facebot|kakaotalk|kakao|slack|discord|telegram|whatsapp|linkedin|twitter|pinterest|skype|line\//i

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).send('Method Not Allowed')
  }

  const code = normalizeCode(request.query?.code)
  if (!code) return response.status(404).send('Not Found')

  if (!isPreviewCrawler(request.headers?.['user-agent'])) {
    response.setHeader('Cache-Control', 'no-store')
    return response.redirect(302, `/?share=${code}`)
  }

  const preview = await loadSharePreview(code)
  const canonicalUrl = `${APP_URL}/s/${code}`

  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  return response.status(200).send(createPreviewHtml({ ...preview, canonicalUrl }))
}

async function loadSharePreview(code) {
  try {
    const apiResponse = await fetch(`${API_BASE_URL}/api/shares/${code}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (!apiResponse.ok) return createFallbackPreview()

    return createSharePreview(await apiResponse.json()) || createFallbackPreview()
  } catch {
    return createFallbackPreview()
  }
}

function createSharePreview(storedResult) {
  const payload = decodePayload(storedResult?.payload)
  if (!payload) return null

  return storedResult.type === 'REFERENCE'
    ? createReferencePreview(payload)
    : createResultPreview(payload)
}

function createResultPreview(payload) {
  const result = readResultPayload(payload)
  if (!result?.stationName) return null

  return {
    title: `만나역 추천 결과 - ${result.stationName}`,
    description: `${formatOrigins(result.originNames)}에서 만난다면? 만나기 좋은 약속역을 확인해보세요.`,
  }
}

function createReferencePreview(payload) {
  const result = readReferencePayload(payload)
  if (!result?.regionLabel) return null

  return {
    title: `만나역 참고 지역 - ${result.regionLabel}`,
    description: `${formatOrigins(result.originNames)}의 중간지점 근처에서 찾은 참고 지역을 확인해보세요.`,
  }
}

function readResultPayload(payload) {
  if (!Array.isArray(payload)) {
    const recommendedStations = payload?.recommendedStations || []
    const fairStations = payload?.fairStations || []
    const stations = [...recommendedStations, ...fairStations]
    const selectedStation = stations.find((station) => station.id === payload?.selectedStationId)
      || recommendedStations[0]
    return {
      originNames: (payload?.origins || []).map(readObjectOriginName),
      stationName: selectedStation?.name,
    }
  }

  if (payload[0] === 3 || payload[0] === 4) {
    const [selectionGroup = 0, selectionIndex = 0] = payload[4] || []
    const station = (selectionGroup === 1 ? payload[3] : payload[2])?.[selectionIndex]
      || payload[2]?.[0]
    return {
      originNames: (payload[1] || []).map((origin) => origin?.[0]),
      stationName: station?.[0],
    }
  }

  if (payload[0] === 2) {
    const stations = [...(payload[2] || []), ...(payload[3] || [])]
    const station = stations.find((candidate) => candidate?.[0] === payload[4]) || payload[2]?.[0]
    return {
      originNames: (payload[1] || []).map((origin) => origin?.[2] || origin?.[1]),
      stationName: station?.[1],
    }
  }

  return null
}

function readReferencePayload(payload) {
  if (!Array.isArray(payload)) {
    const midpoint = payload?.referenceMidpoint
    const areas = midpoint?.practicalAreas || []
    const selectedArea = areas.find((area) => area.id === payload?.selectedReferenceAreaId) || areas[0]
    const regionName = selectedArea?.regionName || midpoint?.regionName
    return {
      originNames: (payload?.origins || []).map(readObjectOriginName),
      regionLabel: regionName ? `${regionName} 일대` : null,
    }
  }

  const midpoint = payload[2]
  const areas = midpoint?.[3] || []
  const selectedAreaIndex = Math.min(Math.max(Number(midpoint?.[4]) || 0, 0), Math.max(areas.length - 1, 0))
  const selectedArea = areas[selectedAreaIndex]
  const regionName = selectedArea?.[6] || midpoint?.[2]
  return {
    originNames: (payload[1] || []).map((origin) => origin?.[0]),
    regionLabel: regionName ? `${regionName} 일대` : null,
  }
}

function decodePayload(encodedPayload) {
  if (typeof encodedPayload !== 'string' || !encodedPayload) return null

  try {
    const isCompressed = encodedPayload.startsWith('z')
    const encoded = isCompressed ? encodedPayload.slice(1) : encodedPayload
    const bytes = Buffer.from(encoded.replaceAll('-', '+').replaceAll('_', '/'), 'base64')
    const json = isCompressed ? gunzipSync(bytes).toString('utf8') : bytes.toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

function createPreviewHtml({ title, description, canonicalUrl }) {
  const safeTitle = escapeHtml(title)
  const safeDescription = escapeHtml(description)
  const safeCanonicalUrl = escapeHtml(canonicalUrl)

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <link rel="canonical" href="${safeCanonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="만나역" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:url" content="${safeCanonicalUrl}" />
    <meta property="og:image" content="${SHARE_IMAGE_URL}" />
    <meta property="og:image:secure_url" content="${SHARE_IMAGE_URL}" />
    <meta property="og:image:alt" content="만나역" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${SHARE_IMAGE_URL}" />
  </head>
  <body></body>
</html>`
}

function createFallbackPreview() {
  return {
    title: '만나역 | 만나기 좋은 약속역·중간역 찾기',
    description: '출발지를 입력하면 이동시간과 위치 균형, 노선 접근성, 주변 상권을 함께 고려한 만나기 좋은 역을 추천해드려요.',
  }
}

function normalizeCode(code) {
  const value = Array.isArray(code) ? code[0] : code
  return SHARE_CODE_PATTERN.test(value || '') ? value : ''
}

function isPreviewCrawler(userAgent = '') {
  return !userAgent || CRAWLER_PATTERN.test(userAgent)
}

function readObjectOriginName(origin) {
  return origin?.routeName || origin?.address || ''
}

function formatOrigins(originNames) {
  const names = originNames.map((name) => String(name || '').trim()).filter(Boolean)
  return names.length ? names.join(' · ') : '여러 출발지'
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export {
  createPreviewHtml,
  createSharePreview,
  decodePayload,
  isPreviewCrawler,
}
