import { getAccessToken } from './authStorage.js'

const API_BASE_URL = (
  import.meta.env.VITE_AUTH_API_BASE_URL
  || import.meta.env.VITE_BACKEND_API_URL
  || 'https://api.mannayeok.kr'
).replace(/\/$/, '')

async function request(path, options = {}) {
  const accessToken = getAccessToken()
  if (!accessToken) throw new Error('로그인이 필요해요.')

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    })
  } catch {
    throw new Error('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.')
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(
      response.status === 401
        ? '로그인이 만료됐어요. 다시 로그인해 주세요.'
        : body.message || body.detail || '내 약속을 처리하지 못했어요.',
    )
    error.status = response.status
    error.code = body.code
    throw error
  }
  return body
}

export function createSavedRecommendation(payload) {
  return request('/api/saved-recommendations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getSavedRecommendations() {
  return request('/api/saved-recommendations')
}

export function updateSavedRecommendation(id, payload) {
  return request(`/api/saved-recommendations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteSavedRecommendation(id) {
  return request(`/api/saved-recommendations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
