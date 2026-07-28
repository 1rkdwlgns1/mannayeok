import routeCsv from './국토교통부_도시철도 전체노선_20251211.csv?raw'

const ROUTE_ROWS = parseCsv(routeCsv)
const ROUTE_STATION_LINES_DB = createStationLinesDb(ROUTE_ROWS)
const LINE_TRANSFER_GRAPH = createLineTransferGraph(ROUTE_STATION_LINES_DB)

export function getRouteStationLines(stationName) {
  return ROUTE_STATION_LINES_DB[normalizeStationName(stationName)] || []
}

export function getMinimumLineTransfers(originLines, stationLines) {
  const normalizedOriginLines = unique(originLines.map(normalizeLineName).filter(Boolean))
  const normalizedStationLines = unique(stationLines.map(normalizeLineName).filter(Boolean))

  if (!normalizedOriginLines.length || !normalizedStationLines.length) return null
  if (normalizedOriginLines.some((line) => normalizedStationLines.includes(line))) return 0

  const targetLines = new Set(normalizedStationLines)
  const visited = new Set(normalizedOriginLines)
  const queue = normalizedOriginLines.map((line) => ({ line, transfers: 0 }))

  while (queue.length) {
    const current = queue.shift()
    const nextLines = LINE_TRANSFER_GRAPH[current.line] || []

    for (const nextLine of nextLines) {
      if (visited.has(nextLine)) continue

      const nextTransfers = current.transfers + 1
      if (targetLines.has(nextLine)) return nextTransfers

      visited.add(nextLine)
      queue.push({ line: nextLine, transfers: nextTransfers })
    }
  }

  return null
}

function createStationLinesDb(rows) {
  const stationLines = {}

  rows.forEach((row) => {
    if (row['권역명'] !== '수도권') return

    const stationName = normalizeStationName(row['역명'])
    const lineName = normalizeLineName(row['노선명'])

    if (!stationName || !lineName) return

    if (!stationLines[stationName]) {
      stationLines[stationName] = []
    }

    if (!stationLines[stationName].includes(lineName)) {
      stationLines[stationName].push(lineName)
    }
  })

  return stationLines
}

function createLineTransferGraph(stationLinesDb) {
  const graph = {}

  Object.values(stationLinesDb).forEach((lines) => {
    if (lines.length < 2) return

    lines.forEach((line) => {
      if (!graph[line]) graph[line] = []

      lines.forEach((nextLine) => {
        if (line !== nextLine && !graph[line].includes(nextLine)) {
          graph[line].push(nextLine)
        }
      })
    })
  })

  return graph
}

function parseCsv(csv) {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/)
  const headers = splitCsvLine(headerLine)

  return lines
    .map((line) => splitCsvLine(line))
    .filter((columns) => columns.length === headers.length)
    .map((columns) =>
      headers.reduce((row, header, index) => {
        row[header] = columns[index]
        return row
      }, {}),
    )
}

function splitCsvLine(line) {
  return line.split(',').map((value) => value.trim())
}

function normalizeStationName(name) {
  if (!name) return ''

  const trimmedName = String(name)
    .replace(/\s+/g, '')
    .replace(/\d+호선/g, '')
    .replace(/경의중앙선/g, '')
    .replace(/수인분당선/g, '')
    .replace(/신분당선/g, '')
    .replace(/공항철도/g, '')
    .replace(/김포골드라인/g, '')
    .replace(/김포도시철도/g, '')
    .replace(/인천\d호선/g, '')
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

  const compactName = String(lineName).replace(/\s+/g, '').trim()

  const aliases = {
    '1': '1호선',
    '2': '2호선',
    '3': '3호선',
    '4': '4호선',
    '5': '5호선',
    '6': '6호선',
    '7': '7호선',
    '8': '8호선',
    '9': '9호선',
    공항: '공항철도',
    공항철도1호선: '공항철도',
    경의중앙: '경의중앙선',
    수인분당: '수인분당선',
    신분당: '신분당선',
    김포골드: '김포골드라인',
    김포도시철도: '김포골드라인',
    우이신설: '우이신설선',
    의정부경전철: '의정부경전철',
    경전철의정부: '의정부경전철',
    인천1: '인천1호선',
    인천2: '인천2호선',
  }

  return aliases[compactName] || compactName.replace(/^0+(\d+)호선$/, '$1호선')
}

function unique(items) {
  return [...new Set(items)]
}
