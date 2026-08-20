import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getLineChipStyle,
  getSubwayLineDisplayName,
  getSubwayLineTheme,
} from '../src/utils/subwayLineTheme.js'

test('경의선 계열 API 명칭을 사용자용 경의·중앙선으로 표시한다', () => {
  assert.equal(getSubwayLineDisplayName('경의선'), '경의·중앙선')
  assert.equal(getSubwayLineDisplayName('경의중앙선'), '경의·중앙선')
  assert.equal(getSubwayLineDisplayName('경의·중앙선'), '경의·중앙선')
  assert.equal(getSubwayLineDisplayName('경춘선'), '경춘선')
})

test('경의선 API 명칭에도 경의·중앙선 노선 색상을 적용한다', () => {
  assert.equal(getSubwayLineTheme('경의선').color, '#77C4A3')
  assert.equal(getSubwayLineTheme('경의·중앙선').color, '#77C4A3')
  assert.equal(getLineChipStyle('경의선').color, '#77C4A3')
})
