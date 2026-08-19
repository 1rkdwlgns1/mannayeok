import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import test from 'node:test'

import handler, { createSharePreview, isPreviewCrawler } from '../api/share-preview.js'

function encode(payload) {
  return `z${gzipSync(JSON.stringify(payload)).toString('base64url')}`
}

test('추천 결과 공유 미리보기에 선택역과 출발역 문구를 표시한다', () => {
  const preview = createSharePreview({
    type: 'RESULT',
    payload: encode([
      4,
      [['노원역 4호선', 37.1, 127.1, '노원역'], ['강남역 2호선', 37.2, 127.2, '강남역']],
      [['건대입구역', 37.5, 127.0], ['왕십리역', 37.6, 127.1]],
      [],
      [0, 0],
    ]),
  })

  assert.deepEqual(preview, {
    title: '만나역 추천 결과 - 건대입구역',
    description: '노원역 4호선 · 강남역 2호선에서 만난다면? 만나기 좋은 약속역을 확인해보세요.',
  })
})

test('일반 브라우저는 결과 화면 URL로 이동시키고 API를 호출하지 않는다', async () => {
  let fetchCalled = false
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    fetchCalled = true
    throw new Error('unexpected fetch')
  }

  const response = createMockResponse()
  try {
    await handler({
      method: 'GET',
      query: { code: '0123456789abcdefabcd' },
      headers: { 'user-agent': 'Mozilla/5.0 Chrome/140.0' },
    }, response)
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(fetchCalled, false)
  assert.equal(response.statusCode, 302)
  assert.equal(response.redirectUrl, '/?share=0123456789abcdefabcd')
})

test('카카오 미리보기 요청을 식별한다', () => {
  assert.equal(isPreviewCrawler('kakaotalk-scrap/1.0'), true)
  assert.equal(isPreviewCrawler('Mozilla/5.0 Chrome/140.0'), false)
})

function createMockResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    send(body) {
      this.body = body
      return this
    },
    redirect(code, url) {
      this.statusCode = code
      this.redirectUrl = url
      return this
    },
  }
}
