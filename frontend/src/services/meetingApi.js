import { getAccessToken } from './authStorage.js'

const API_BASE_URL = (
  import.meta.env.VITE_AUTH_API_BASE_URL
  || import.meta.env.VITE_BACKEND_API_URL
  || 'https://api.mannayeok.kr'
).replace(/\/$/, '')

async function request(path, options = {}, authenticated = false) {
  const accessToken = getAccessToken()
  if (authenticated && !accessToken) throw new Error('로그인이 필요해요.')

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authenticated && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
        : body.message || body.detail || '모임 정보를 처리하지 못했어요.',
    )
    error.status = response.status
    throw error
  }
  return body
}

export function createCollaborativeMeeting(savedRecommendationId) {
  return request('/api/meetings', {
    method: 'POST',
    body: JSON.stringify({ savedRecommendationId }),
  }, true)
}

export function getCollaborativeMeetingBySource(savedRecommendationId) {
  return request(`/api/meetings/owned/source/${encodeURIComponent(savedRecommendationId)}`, {}, true)
}

export function getCollaborativeMeeting(inviteCode) {
  return request(`/api/meetings/${encodeURIComponent(inviteCode)}`)
}

export function joinCollaborativeMeeting(inviteCode, participant) {
  return request(`/api/meetings/${encodeURIComponent(inviteCode)}/participants`, {
    method: 'POST',
    body: JSON.stringify(participant),
  })
}

export function updateMeetingParticipant(inviteCode, participantId, participantToken, participant) {
  return request(`/api/meetings/${encodeURIComponent(inviteCode)}/participants/${encodeURIComponent(participantId)}`, {
    method: 'PUT',
    headers: { 'X-Participant-Token': participantToken },
    body: JSON.stringify(participant),
  })
}

export function updateCollaborativeMeetingResult(inviteCode, result) {
  return request(`/api/meetings/owned/${encodeURIComponent(inviteCode)}/result`, {
    method: 'PUT',
    body: JSON.stringify(result),
  }, true)
}

export function removeMeetingParticipant(inviteCode, participantId) {
  return request(`/api/meetings/owned/${encodeURIComponent(inviteCode)}/participants/${encodeURIComponent(participantId)}`, {
    method: 'DELETE',
  }, true)
}
