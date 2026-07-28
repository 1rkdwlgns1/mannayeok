import subwayStationData from './서울교통공사_노선별 지하철역 정보.json'
import { getRouteStationLines } from './subwayRouteGraph'

const STATION_NAME_ALIASES = {
  연남동역: '홍대입구역',
  상암DMC역: '디지털미디어시티역',
  DMC역: '디지털미디어시티역',
}

const MANUAL_STATION_LINES = {
  홍대입구역: ['2호선', '경의중앙선', '공항철도'],
  디지털미디어시티역: ['6호선', '경의중앙선', '공항철도'],
  공덕역: ['5호선', '6호선', '경의중앙선', '공항철도'],
  서울역: ['1호선', '4호선', '경의중앙선', '공항철도'],
  김포공항역: ['5호선', '9호선', '공항철도', '김포골드라인'],
  여의도역: ['5호선', '9호선'],
  왕십리역: ['2호선', '5호선', '경의중앙선', '수인분당선'],
  청량리역: ['1호선', '경의중앙선', '수인분당선'],
  회기역: ['1호선', '경의중앙선'],
  옥수역: ['3호선', '경의중앙선'],
  한남역: ['경의중앙선'],
  용산역: ['1호선', '경의중앙선'],
  강남역: ['2호선', '신분당선'],
  신논현역: ['9호선', '신분당선'],
  양재역: ['3호선', '신분당선'],
  판교역: ['신분당선', '경강선'],
  정자역: ['수인분당선', '신분당선'],
  미금역: ['수인분당선', '신분당선'],
  수원역: ['1호선', '수인분당선'],
  인천역: ['1호선', '수인분당선'],
  원인재역: ['수인분당선', '인천1호선'],
  부평구청역: ['7호선', '인천1호선'],
  검단오류역: ['인천2호선'],
  구월동역: ['인천1호선'],
  인천터미널역: ['인천1호선'],
  석촌역: ['8호선', '9호선'],
  종합운동장역: ['2호선', '9호선'],
  봉은사역: ['9호선'],
  선정릉역: ['9호선', '수인분당선'],
  노량진역: ['1호선', '9호선'],
  사당역: ['2호선', '4호선'],
  이수역: ['4호선', '7호선'],
  고속터미널역: ['3호선', '7호선', '9호선'],
  건대입구역: ['2호선', '7호선'],
  군자역: ['5호선', '7호선'],
  태릉입구역: ['6호선', '7호선'],
  석계역: ['1호선', '6호선'],
  노원역: ['4호선', '7호선'],
  창동역: ['1호선', '4호선'],
  도봉산역: ['1호선', '7호선'],
  회룡역: ['1호선', '의정부경전철'],
  의정부역: ['1호선', '의정부경전철'],
  북한산우이역: ['우이신설선'],
  성신여대입구역: ['4호선', '우이신설선'],
  보라매역: ['7호선', '신림선'],
  신림역: ['2호선', '신림선'],
  샛강역: ['9호선', '신림선'],
  당산역: ['2호선', '9호선'],
  마곡나루역: ['9호선', '공항철도'],
  계양역: ['공항철도', '인천1호선'],
  검암역: ['공항철도', '인천2호선'],
  양촌역: ['김포골드라인'],
  구래역: ['김포골드라인'],
  마산역: ['김포골드라인'],
  장기역: ['김포골드라인'],
  운양역: ['김포골드라인'],
}

export const STATION_LINES_DB = createStationLinesDb(subwayStationData.DATA || [])

export function getStationLines(stationName) {
  const normalizedName = normalizeLineStationName(stationName)
  const canonicalName = STATION_NAME_ALIASES[normalizedName] || normalizedName

  return [
    ...new Set([
      ...(STATION_LINES_DB[canonicalName] || []),
      ...getRouteStationLines(canonicalName),
    ]),
  ]
}

function createStationLinesDb(rows) {
  const stationLines = {}

  rows.forEach((row) => {
    const stationName = normalizeLineStationName(row.station_nm)
    const lineName = normalizeLineName(row.line_num)

    if (!stationName || !lineName) return

    if (!stationLines[stationName]) {
      stationLines[stationName] = []
    }

    if (!stationLines[stationName].includes(lineName)) {
      stationLines[stationName].push(lineName)
    }
  })

  Object.entries(MANUAL_STATION_LINES).forEach(([stationName, lines]) => {
    const normalizedName = normalizeLineStationName(stationName)

    if (!stationLines[normalizedName]) {
      stationLines[normalizedName] = []
    }

    lines.forEach((line) => {
      const normalizedLine = normalizeLineName(line)
      if (normalizedLine && !stationLines[normalizedName].includes(normalizedLine)) {
        stationLines[normalizedName].push(normalizedLine)
      }
    })
  })

  return stationLines
}

function normalizeLineStationName(name) {
  if (!name) return ''

  const trimmedName = String(name)
    .replace(/\s+/g, '')
    .replace(/\d+호선/g, '')
    .replace(/경의중앙선/g, '')
    .replace(/경의선/g, '')
    .replace(/경춘선/g, '')
    .replace(/경강선/g, '')
    .replace(/서해선/g, '')
    .replace(/수인분당선/g, '')
    .replace(/신분당선/g, '')
    .replace(/GTX-A/gi, '')
    .replace(/공항철도/g, '')
    .replace(/김포골드라인/g, '')
    .replace(/김포도시철도/g, '')
    .replace(/인천\d호선/g, '')
    .replace(/인천선/g, '')
    .replace(/용인경전철/g, '')
    .replace(/우이신설경전철/g, '')
    .replace(/우이신설선/g, '')
    .replace(/신림선/g, '')
    .replace(/의정부경전철/g, '')
    .replace(/경전철의정부/g, '')
    .trim()

  if (!trimmedName) return ''
  return trimmedName.endsWith('역') ? trimmedName : `${trimmedName}역`
}

function normalizeLineName(lineName) {
  if (!lineName) return ''

  return String(lineName)
    .replace(/^0+(\d+)호선$/, '$1호선')
    .replace(/^(\d+)$/, '$1호선')
    .replace(/김포도시철도/g, '김포골드라인')
    .replace(/공항철도\d*호선/g, '공항철도')
    .replace(/\s+/g, '')
    .trim()
}
