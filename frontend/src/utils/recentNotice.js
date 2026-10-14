export const RECENT_NOTICE_DURATION_MS = 5 * 24 * 60 * 60 * 1000

export function getRecentNoticeIndicator(notices, now = Date.now()) {
  if (!Array.isArray(notices)) return null

  return notices.reduce((latestIndicator, notice) => {
    const publishedAt = getPublishedTime(notice)
    if (!Number.isFinite(publishedAt) || publishedAt > now) return latestIndicator

    const expiresAt = publishedAt + RECENT_NOTICE_DURATION_MS
    if (expiresAt <= now || (latestIndicator && latestIndicator.publishedAt >= publishedAt)) {
      return latestIndicator
    }

    return {
      key: `${notice?.id ?? 'notice'}:${notice?.publishedAt ?? publishedAt}`,
      publishedAt,
      expiresAt,
    }
  }, null)
}

export function getRecentNoticeExpiry(notices, now = Date.now()) {
  return getRecentNoticeIndicator(notices, now)?.expiresAt || 0
}

function getPublishedTime(notice) {
  const publishedValue = notice?.publishedAt || ''
  const publishedAt = new Date(publishedValue).getTime()
  if (!Number.isFinite(publishedAt)) return Number.NaN

  const publishedDate = String(publishedValue).slice(0, 10)
  return ['createdAt', 'updatedAt'].reduce((latestTime, field) => {
    const activityValue = notice?.[field] || ''
    if (String(activityValue).slice(0, 10) !== publishedDate) return latestTime

    const activityTime = new Date(activityValue).getTime()
    return Number.isFinite(activityTime) ? Math.max(latestTime, activityTime) : latestTime
  }, publishedAt)
}

