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
    throw new Error('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.')
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || '요청을 처리하지 못했어요.')
  return body
}

export function login(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function signup(payload) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function checkEmailAvailability(email) {
  return request('/api/auth/email-availability', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function requestPasswordReset(email) {
  return request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(payload) {
  return request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function changePassword(payload, accessToken) {
  return request('/api/members/me/password', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
}

export function deleteMember(payload, accessToken) {
  return request('/api/members/me', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
}
