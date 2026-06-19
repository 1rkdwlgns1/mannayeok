const KAKAO_LOCAL_BASE_URL = 'https://dapi.kakao.com/v2/local/search'

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    response.status(204).end()
    return
  }

  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  const restApiKey = process.env.KAKAO_REST_API_KEY || process.env.VITE_KAKAO_REST_API_KEY

  if (!restApiKey) {
    response.status(500).json({ error: 'KAKAO_REST_API_KEY is not configured' })
    return
  }

  const { type, ...query } = request.query
  const endpoint = type === 'category' ? 'category.json' : type === 'keyword' ? 'keyword.json' : null

  if (!endpoint) {
    response.status(400).json({ error: 'Invalid local search type' })
    return
  }

  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item))
      return
    }

    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value)
    }
  })

  try {
    const kakaoResponse = await fetch(`${KAKAO_LOCAL_BASE_URL}/${endpoint}?${params.toString()}`, {
      headers: {
        Authorization: `KakaoAK ${restApiKey}`,
      },
    })

    const bodyText = await kakaoResponse.text()
    response.status(kakaoResponse.status)
    response.setHeader('Content-Type', kakaoResponse.headers.get('content-type') || 'application/json')
    response.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    response.send(bodyText)
  } catch {
    response.status(502).json({ error: 'Kakao Local API request failed' })
  }
}
