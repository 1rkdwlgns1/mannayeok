import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getRecentNoticeExpiry,
  getRecentNoticeIndicator,
  RECENT_NOTICE_DURATION_MS,
} from '../src/utils/recentNotice.js'

test('공개 시점부터 5일 동안 새 공지 만료 시점을 반환한다', () => {
  const publishedAt = '2026-10-14T00:00:00'
  const createdAt = '2026-10-14T15:30:00'
  const publishedTime = new Date(createdAt).getTime()

  assert.equal(
    getRecentNoticeExpiry([{ publishedAt, createdAt }], publishedTime),
    publishedTime + RECENT_NOTICE_DURATION_MS,
  )
  assert.equal(
    getRecentNoticeExpiry([{ publishedAt, createdAt }], publishedTime + RECENT_NOTICE_DURATION_MS),
    0,
  )
})

test('미래 또는 잘못된 게시 시점은 새 공지로 표시하지 않는다', () => {
  const now = new Date('2026-10-14T00:00:00').getTime()

  assert.equal(getRecentNoticeExpiry([
    { publishedAt: '2026-10-15T00:00:00' },
    { publishedAt: null },
  ], now), 0)
})

test('여러 공지 중 가장 최근 공지의 확인 키를 반환한다', () => {
  const now = new Date('2026-10-14T16:00:00').getTime()
  const indicator = getRecentNoticeIndicator([
    { id: 10, publishedAt: '2026-10-14T00:00:00', createdAt: '2026-10-14T13:00:00' },
    { id: 11, publishedAt: '2026-10-14T00:00:00', createdAt: '2026-10-14T15:30:00' },
  ], now)

  assert.equal(indicator.key, '11:2026-10-14T00:00:00')
})

