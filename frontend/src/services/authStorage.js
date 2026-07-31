const ACCESS_TOKEN_KEY = 'mannayeok.accessToken'
const MEMBER_KEY = 'mannayeok.member'

export function saveAuth(auth, remember) {
  clearAuth()
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(ACCESS_TOKEN_KEY, auth.accessToken)
  storage.setItem(MEMBER_KEY, JSON.stringify(auth.member))
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(MEMBER_KEY)
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(MEMBER_KEY)
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
