const API_BASE_URL = (
  import.meta.env.VITE_AUTH_API_BASE_URL
  || import.meta.env.VITE_BACKEND_API_URL
  || 'https://api.mannayeok.kr'
).replace(/\/$/, '')

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  } catch {
    throw new Error('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.')
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.message || '요청을 처리하지 못했어요.')
    error.code = body.code
    error.status = response.status
    throw error
  }
  return body
}

export function getPublishedNotices() {
  return request('/api/notices')
}

export function getAdminNotices(accessToken) {
  return request('/api/admin/notices', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export function createNotice(payload, accessToken) {
  return request('/api/admin/notices', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}

export function updateNotice(noticeId, payload, accessToken) {
  return request(`/api/admin/notices/${noticeId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}

export function deleteNotice(noticeId, accessToken) {
  return request(`/api/admin/notices/${noticeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export function restoreNotice(noticeId, accessToken) {
  return request(`/api/admin/notices/${noticeId}/restore`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
