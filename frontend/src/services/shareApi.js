const API_BASE_URL = (
  import.meta.env.VITE_AUTH_API_BASE_URL
  || import.meta.env.VITE_BACKEND_API_URL
  || 'https://api.mannayeok.kr'
).replace(/\/$/, '')

async function request(path, options) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  } catch {
    throw new Error('공유 링크 서버에 연결하지 못했어요.')
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 410) {
      throw new Error('공유 링크가 만료되었어요. 새로운 결과를 공유해 주세요.')
    }
    throw new Error(body.message || '공유 링크를 처리하지 못했어요.')
  }
  return body
}

export function createSharedResult(type, payload) {
  return request('/api/shares', {
    method: 'POST',
    body: JSON.stringify({ type, payload }),
  })
}

export function getSharedResult(code) {
  return request(`/api/shares/${encodeURIComponent(code)}`)
}
