import stationDistanceData from './서울교통공사_역간거리.json'
import routeCsv from './국토교통부_도시철도 전체노선_20251211.csv?raw'
import sectionDistanceCsv from './서울특별시_철도역 구간.csv?raw'

const DEFAULT_SECTION_MINUTES = 2.4
const DEFAULT_KORAIL_SECTION_MINUTES = 3.2
const TRANSFER_MINUTES = 5
const TRANSFER_COST_PENALTY = 12
const METERS_PER_MINUTE = 650

const GRAPH = createTravelTimeGraph()

export function estimateSubwayTravel(originStationName, destinationStationName) {
  const originName = normalizeStationName(originStationName)
  const destinationName = normalizeStationName(destinationStationName)

  if (!originName || !destinationName) return null
  if (originName === destinationName) {
    return {
      from: originName,
      to: destinationName,
      minutes: 0,
      transfers: 0,
      path: [originName],
    }
  }

  const originNodes = GRAPH.stationNodes.get(originName) || []
  const destinationNodes = new Set(GRAPH.stationNodes.get(destinationName) || [])

  if (!originNodes.length || !destinationNodes.size) return null

  return runDijkstra(originNodes, destinationNodes, originName, destinationName)
}

export function getStationTransitTimeProfile(origins, stationName) {
  const targetName = normalizeStationName(stationName)
  const items = origins.map((origin, index) => {
    const originName = getOriginStationName(origin)
    const travel = estimateSubwayTravel(originName, targetName)

    return {
      originIndex: index,
      originName: normalizeStationName(originName),
      targetName,
      minutes: travel?.minutes ?? null,
      transfers: travel?.transfers ?? null,
      path: travel?.path || [],
    }
  })

  const validItems = items.filter((item) => Number.isFinite(item.minutes))
  const minutes = validItems.map((item) => item.minutes)
  const transfers = validItems.map((item) => item.transfers)

  return {
    targetName,
    items,
    hasAllEstimates: validItems.length === items.length && items.length > 0,
    averageMinutes: average(minutes),
    minMinutes: minutes.length ? Math.min(...minutes) : null,
    maxMinutes: minutes.length ? Math.max(...minutes) : null,
    maxTransferCount: transfers.length ? Math.max(...transfers) : null,
  }
}

function createTravelTimeGraph() {
  const graph = new Map()
  const stationNodes = new Map()

  addSeoulMetroDistanceEdges(graph, stationNodes)
  addRouteOrderEdges(graph, stationNodes)
  addSectionDistanceEdges(graph, stationNodes)
  addTransferEdges(graph, stationNodes)

  return { graph, stationNodes }
}

function addSeoulMetroDistanceEdges(graph, stationNodes) {
  const rows = stationDistanceData.DATA || []
  const groupedRows = new Map()

  rows.forEach((row) => {
    const stationName = normalizeStationName(row.sbwy_stns_nm)
    const lineName = normalizeLineName(row.sbwy_rout_ln)

    if (!stationName || !lineName) return

    const key = `seoul:${lineName}`
    if (!groupedRows.has(key)) groupedRows.set(key, [])

    groupedRows.get(key).push({
      stationName,
      lineName,
      sequence: Number(row.acml_dist) || 0,
      minutesFromPrevious: parseHmToMinutes(row.hm),
    })
  })

  groupedRows.forEach((rowsInLine) => {
    rowsInLine
      .sort((a, b) => a.sequence - b.sequence)
      .forEach((row, index, sortedRows) => {
        ensureNode(graph, stationNodes, row.stationName, row.lineName)

        if (index === 0) return

        const previous = sortedRows[index - 1]
        const minutes = row.minutesFromPrevious || getDefaultSectionMinutes(row.lineName)
        addBidirectionalEdge(graph, stationNodes, previous.stationName, row.stationName, row.lineName, minutes)
      })
  })
}

function addRouteOrderEdges(graph, stationNodes) {
  const rows = parseCsv(routeCsv)
  const groupedRows = new Map()

  rows.forEach((row) => {
    if (row['권역명'] !== '수도권') return

    const stationName = normalizeStationName(row['역명'])
    const lineName = normalizeLineName(row['노선명'])
    const operatorName = row['철도운영기관명'] || ''
    const sequence = Number(row['순번'])

    if (operatorName.includes('서울교통공사')) return
    if (!stationName || !lineName || !Number.isFinite(sequence)) return

    const key = `${operatorName}:${lineName}`
    if (!groupedRows.has(key)) groupedRows.set(key, [])

    groupedRows.get(key).push({
      stationName,
      lineName,
      operatorName,
      sequence,
    })
  })

  groupedRows.forEach((rowsInLine) => {
    rowsInLine
      .sort((a, b) => a.sequence - b.sequence)
      .forEach((row, index, sortedRows) => {
        ensureNode(graph, stationNodes, row.stationName, row.lineName)

        if (index === 0) return

        const previous = sortedRows[index - 1]
        const minutes =
          row.operatorName.includes('코레일') || previous.operatorName.includes('코레일')
            ? DEFAULT_KORAIL_SECTION_MINUTES
            : getDefaultSectionMinutes(row.lineName)

        addBidirectionalEdge(graph, stationNodes, previous.stationName, row.stationName, row.lineName, minutes)
      })
  })
}

function addSectionDistanceEdges(graph, stationNodes) {
  const rows = parseCsv(sectionDistanceCsv)

  rows.forEach((row) => {
    const fromName = normalizeStationName(row['출발_역_명칭'])
    const toName = normalizeStationName(row['도착_역_명칭'])
    const lineName = normalizeLineName(row['출발_호선_내용'])
    const distanceMeters = Number(row['거리'])

    if (!fromName || !toName || !lineName || !Number.isFinite(distanceMeters)) return

    const minutes = Math.max(1.2, distanceMeters / METERS_PER_MINUTE)
    addBidirectionalEdge(graph, stationNodes, fromName, toName, lineName, minutes)
  })
}

function addTransferEdges(graph, stationNodes) {
  stationNodes.forEach((nodes) => {
    if (nodes.length < 2) return

    nodes.forEach((node) => {
      nodes.forEach((nextNode) => {
        if (node === nextNode) return
        addDirectedEdge(graph, node, nextNode, TRANSFER_MINUTES, 1, TRANSFER_COST_PENALTY)
      })
    })
  })
}

function runDijkstra(startNodes, targetNodes, originName, destinationName) {
  const distances = new Map()
  const previous = new Map()
  const queue = []

  startNodes.forEach((node) => {
    const initialState = { cost: 0, minutes: 0, transfers: 0 }
    distances.set(node, initialState)
    queue.push({ node, ...initialState })
  })

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost || a.transfers - b.transfers || a.minutes - b.minutes)
    const current = queue.shift()
    const known = distances.get(current.node)

    if (
      !known ||
      known.cost !== current.cost ||
      known.minutes !== current.minutes ||
      known.transfers !== current.transfers
    ) {
      continue
    }

    if (targetNodes.has(current.node)) {
      return {
        from: originName,
        to: destinationName,
        minutes: roundMinutes(current.minutes),
        transfers: current.transfers,
        path: createStationPath(previous, current.node),
      }
    }

    const edges = GRAPH.graph.get(current.node) || []

    edges.forEach((edge) => {
      const nextState = {
        cost: current.cost + edge.costMinutes,
        minutes: current.minutes + edge.minutes,
        transfers: current.transfers + edge.transfers,
      }
      const previousState = distances.get(edge.to)

      if (
        !previousState ||
        nextState.cost < previousState.cost ||
        (nextState.cost === previousState.cost && nextState.transfers < previousState.transfers) ||
        (nextState.cost === previousState.cost &&
          nextState.transfers === previousState.transfers &&
          nextState.minutes < previousState.minutes)
      ) {
        distances.set(edge.to, nextState)
        previous.set(edge.to, current.node)
        queue.push({ node: edge.to, ...nextState })
      }
    })
  }

  return null
}

function createStationPath(previous, endNode) {
  const path = []
  let currentNode = endNode

  while (currentNode) {
    const [stationName] = currentNode.split('|')
    if (path[0] !== stationName) path.unshift(stationName)
    currentNode = previous.get(currentNode)
  }

  return path
}

function addBidirectionalEdge(graph, stationNodes, fromName, toName, lineName, minutes) {
  const fromNode = ensureNode(graph, stationNodes, fromName, lineName)
  const toNode = ensureNode(graph, stationNodes, toName, lineName)

  addDirectedEdge(graph, fromNode, toNode, minutes, 0)
  addDirectedEdge(graph, toNode, fromNode, minutes, 0)
}

function addDirectedEdge(graph, fromNode, toNode, minutes, transfers, costMinutes = minutes) {
  if (!graph.has(fromNode)) graph.set(fromNode, [])

  const edges = graph.get(fromNode)
  const existingEdge = edges.find((edge) => edge.to === toNode && edge.transfers === transfers)

  if (existingEdge) {
    if (
      costMinutes < existingEdge.costMinutes ||
      (costMinutes === existingEdge.costMinutes && minutes < existingEdge.minutes)
    ) {
      existingEdge.minutes = minutes
      existingEdge.costMinutes = costMinutes
    }
    return
  }

  edges.push({ to: toNode, minutes, transfers, costMinutes })
}

function ensureNode(graph, stationNodes, stationName, lineName) {
  const node = `${stationName}|${lineName}`

  if (!graph.has(node)) graph.set(node, [])
  if (!stationNodes.has(stationName)) stationNodes.set(stationName, [])
  if (!stationNodes.get(stationName).includes(node)) stationNodes.get(stationName).push(node)

  return node
}

function getOriginStationName(origin) {
  return (
    origin?.nearbyStationName ||
    origin?.routeName ||
    origin?.address ||
    origin?.query ||
    ''
  )
}

function normalizeStationName(name) {
  if (!name) return ''

  const normalizedName = String(name)
    .replace(/\([^)]*\)/g, '')
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

  if (!normalizedName) return ''
  return normalizedName.endsWith('역') ? normalizedName : `${normalizedName}역`
}

function normalizeLineName(lineName) {
  if (!lineName) return ''

  const compactName = String(lineName).replace(/\s+/g, '').trim()

  if (/^\d+$/.test(compactName)) {
    if (compactName.length >= 3) return `${Number(compactName[0])}호선`
    return `${Number(compactName)}호선`
  }

  const aliases = {
    공항: '공항철도',
    공항철도1호선: '공항철도',
    경의중앙: '경의중앙선',
    수인분당: '수인분당선',
    신분당: '신분당선',
    김포도시철도: '김포골드라인',
    경전철의정부: '의정부경전철',
    인천1: '인천1호선',
    인천2: '인천2호선',
  }

  return aliases[compactName] || compactName.replace(/^0+(\d+)호선$/, '$1호선')
}

function getDefaultSectionMinutes(lineName) {
  return lineName === '1호선' ? DEFAULT_KORAIL_SECTION_MINUTES : DEFAULT_SECTION_MINUTES
}

function parseHmToMinutes(value) {
  if (!value) return null

  const [minutes, seconds = '0'] = String(value).split(':').map(Number)

  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null
  return minutes + seconds / 60
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

function average(values) {
  if (!values.length) return null
  return roundMinutes(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function roundMinutes(value) {
  return Math.round(value * 10) / 10
}
