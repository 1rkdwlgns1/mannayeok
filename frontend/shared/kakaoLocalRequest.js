const ENDPOINTS = {
  address: 'address.json',
  category: 'category.json',
  keyword: 'keyword.json',
}

const ALLOWED_PARAMS = {
  address: new Set(['query', 'analyze_type', 'page', 'size']),
  category: new Set(['category_group_code', 'x', 'y', 'radius', 'rect', 'page', 'size', 'sort']),
  keyword: new Set([
    'query',
    'category_group_code',
    'x',
    'y',
    'radius',
    'rect',
    'page',
    'size',
    'sort',
  ]),
}

export function validateKakaoLocalRequest(searchParams) {
  const type = searchParams.get('type')
  const endpoint = ENDPOINTS[type]

  if (!endpoint) return { error: 'Invalid local search type' }

  const params = new URLSearchParams()
  for (const [key, value] of searchParams.entries()) {
    if (key === 'type') continue
    if (!ALLOWED_PARAMS[type].has(key)) return { error: `Unsupported parameter: ${key}` }
    if (params.has(key)) return { error: `Duplicate parameter: ${key}` }
    params.set(key, value)
  }

  const query = params.get('query')?.trim()
  if ((type === 'address' || type === 'keyword') && (!query || query.length > 100)) {
    return { error: 'Query must be between 1 and 100 characters' }
  }
  if (query) params.set('query', query)

  if (type === 'category' && !/^[A-Z0-9]{2,4}$/.test(params.get('category_group_code') || '')) {
    return { error: 'Invalid category group code' }
  }
  if (!validateIntegerParam(params, 'page', 1, 45)) return { error: 'Invalid page' }
  if (!validateIntegerParam(params, 'size', 1, 15)) return { error: 'Invalid size' }
  if (!validateIntegerParam(params, 'radius', 0, 20_000)) return { error: 'Invalid radius' }
  if (!validateCoordinateParam(params, 'x', -180, 180)) return { error: 'Invalid x coordinate' }
  if (!validateCoordinateParam(params, 'y', -90, 90)) return { error: 'Invalid y coordinate' }

  const sort = params.get('sort')
  if (sort && !['accuracy', 'distance'].includes(sort)) return { error: 'Invalid sort' }

  const analyzeType = params.get('analyze_type')
  if (analyzeType && !['similar', 'exact'].includes(analyzeType)) {
    return { error: 'Invalid analyze type' }
  }

  const rect = params.get('rect')
  if (rect && !isValidRect(rect)) return { error: 'Invalid rect' }

  return { endpoint, params }
}

function validateIntegerParam(params, key, minimum, maximum) {
  const value = params.get(key)
  if (value === null) return true

  const number = Number(value)
  return Number.isInteger(number) && number >= minimum && number <= maximum
}

function validateCoordinateParam(params, key, minimum, maximum) {
  const value = params.get(key)
  if (value === null) return true

  const number = Number(value)
  return Number.isFinite(number) && number >= minimum && number <= maximum
}

function isValidRect(value) {
  const coordinates = value.split(',').map(Number)

  return (
    coordinates.length === 4 &&
    coordinates.every(Number.isFinite) &&
    coordinates[0] >= -180 &&
    coordinates[0] <= 180 &&
    coordinates[2] >= -180 &&
    coordinates[2] <= 180 &&
    coordinates[1] >= -90 &&
    coordinates[1] <= 90 &&
    coordinates[3] >= -90 &&
    coordinates[3] <= 90
  )
}
