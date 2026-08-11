const ACCESS_TOKEN_KEY = 'mannayeok.accessToken'
const MEMBER_KEY = 'mannayeok.member'
const AUTH_CHANNEL_NAME = 'mannayeok-auth'

function isExpiredAccessToken(accessToken) {
  if (!accessToken) return true

  try {
    const payloadBase64 = accessToken.split('.')[1]
    if (!payloadBase64) return true
    const normalized = payloadBase64.replaceAll('-', '+').replaceAll('_', '/')
    const payload = JSON.parse(window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')))
    return !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

function getValidStoredAuth() {
  for (const storage of [localStorage, sessionStorage]) {
    const accessToken = storage.getItem(ACCESS_TOKEN_KEY)
    const serializedMember = storage.getItem(MEMBER_KEY)
    if (!accessToken && !serializedMember) continue

    if (!accessToken || !serializedMember || isExpiredAccessToken(accessToken)) {
      storage.removeItem(ACCESS_TOKEN_KEY)
      storage.removeItem(MEMBER_KEY)
      continue
    }

    return { accessToken, serializedMember }
  }

  return null
}

function broadcastAuthChange(type) {
  if (!('BroadcastChannel' in window)) return
  const channel = new BroadcastChannel(AUTH_CHANNEL_NAME)
  channel.postMessage({ type })
  channel.close()
}

export function saveAuth(auth, remember) {
  clearAuth()
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(ACCESS_TOKEN_KEY, auth.accessToken)
  storage.setItem(MEMBER_KEY, JSON.stringify(auth.member))
  broadcastAuthChange('login')
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(MEMBER_KEY)
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(MEMBER_KEY)
  sessionStorage.removeItem('mannayeok.adminAccessToken')
  sessionStorage.removeItem('mannayeok.adminAccessTokenExpiresAt')
  broadcastAuthChange('logout')
}

export function getStoredMember() {
  const storedAuth = getValidStoredAuth()
  if (!storedAuth) return null

  try {
    return JSON.parse(storedAuth.serializedMember)
  } catch {
    clearAuth()
    return null
  }
}

export function getAccessToken() {
  return getValidStoredAuth()?.accessToken || null
}

export function watchAuthChanges(onChange) {
  const handleStorage = (event) => {
    if (event.key === ACCESS_TOKEN_KEY || event.key === MEMBER_KEY) onChange()
  }
  window.addEventListener('storage', handleStorage)

  const channel = 'BroadcastChannel' in window
    ? new BroadcastChannel(AUTH_CHANNEL_NAME)
    : null
  if (channel) channel.onmessage = onChange

  return () => {
    window.removeEventListener('storage', handleStorage)
    channel?.close()
  }
}
