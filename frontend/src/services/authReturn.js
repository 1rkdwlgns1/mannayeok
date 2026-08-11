const AUTH_RETURN_PATH_KEY = 'mannayeok.authReturnPath'

function normalizeLocalPath(path, fallback = '/') {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
    ? path
    : fallback
}

export function setAuthReturnPath(path) {
  window.sessionStorage.setItem(AUTH_RETURN_PATH_KEY, normalizeLocalPath(path))
}

export function consumeAuthReturnPath(fallback = '/') {
  const storedPath = window.sessionStorage.getItem(AUTH_RETURN_PATH_KEY)
  window.sessionStorage.removeItem(AUTH_RETURN_PATH_KEY)
  return normalizeLocalPath(storedPath, fallback)
}
