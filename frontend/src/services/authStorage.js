const ACCESS_TOKEN_KEY = 'mannayeok.accessToken'
const MEMBER_KEY = 'mannayeok.member'
const AUTH_CHANNEL_NAME = 'mannayeok-auth'

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
  broadcastAuthChange('logout')
}

export function getStoredMember() {
  const serializedMember = localStorage.getItem(MEMBER_KEY) || sessionStorage.getItem(MEMBER_KEY)
  if (!serializedMember) return null

  try {
    return JSON.parse(serializedMember)
  } catch {
    clearAuth()
    return null
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY)
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
