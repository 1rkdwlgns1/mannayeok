const API_BASE_URL = (
  import.meta.env.VITE_AUTH_API_BASE_URL
  || import.meta.env.VITE_BACKEND_API_URL
  || 'https://api.mannayeok.kr'
).replace(/\/$/, '')

const ADMIN_ACCESS_TOKEN_KEY = 'mannayeok.adminAccessToken'
const ADMIN_ACCESS_TOKEN_EXPIRES_AT_KEY = 'mannayeok.adminAccessTokenExpiresAt'

async function request(path, accessToken, options = {}) {
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
    const error = new Error(body.message || '요청을 처리하지 못했어요.')
    error.code = body.code
    error.status = response.status
    throw error
  }
  return body
}

export function getAdminVerificationStatus(accessToken) {
  return request('/api/admin/verification/status', accessToken)
}

export function setupAdminSecondaryPassword(payload, accessToken) {
  return request('/api/admin/verification/setup', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function verifyAdminSecondaryPassword(password, accessToken) {
  return request('/api/admin/verify', accessToken, {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export function saveAdminAccessToken(auth) {
  const expiresAt = Date.now() + Number(auth.expiresIn || 0) * 1000
  sessionStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, auth.accessToken)
  sessionStorage.setItem(ADMIN_ACCESS_TOKEN_EXPIRES_AT_KEY, String(expiresAt))
}

export function clearAdminAccessToken() {
  sessionStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(ADMIN_ACCESS_TOKEN_EXPIRES_AT_KEY)
}

export function getAdminAccessToken() {
  const token = sessionStorage.getItem(ADMIN_ACCESS_TOKEN_KEY)
  const expiresAt = Number(sessionStorage.getItem(ADMIN_ACCESS_TOKEN_EXPIRES_AT_KEY) || 0)
  if (!token || !expiresAt || expiresAt <= Date.now()) {
    clearAdminAccessToken()
    return null
  }
  return token
}
