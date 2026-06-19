const KAKAO_DIRECTIONS_URL = 'https://apis-navi.kakaomobility.com/v1/directions'

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

  const restApiKey =
    process.env.KAKAO_MOBILITY_KEY ||
    process.env.VITE_KAKAO_MOBILITY_KEY ||
    process.env.KAKAO_REST_API_KEY ||
    process.env.VITE_KAKAO_REST_API_KEY

  if (!restApiKey) {
    response.status(500).json({ error: 'Kakao REST API key is not configured' })
    return
  }

  const { origin, destination, priority = 'RECOMMEND' } = request.query

  if (!origin || !destination) {
    response.status(400).json({ error: 'origin and destination are required' })
    return
  }

  const params = new URLSearchParams({ origin, destination, priority })

  try {
    const kakaoResponse = await fetch(`${KAKAO_DIRECTIONS_URL}?${params.toString()}`, {
      headers: {
        Authorization: `KakaoAK ${restApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    const bodyText = await kakaoResponse.text()
    response.status(kakaoResponse.status)
    response.setHeader('Content-Type', kakaoResponse.headers.get('content-type') || 'application/json')
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    response.send(bodyText)
  } catch {
    response.status(502).json({ error: 'Kakao Mobility API request failed' })
  }
}
