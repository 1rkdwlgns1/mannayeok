const KAKAO_SHARE_SDK_ID = 'kakao-share-sdk'
const KAKAO_SHARE_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js'
const KAKAO_SHARE_LOAD_TIMEOUT_MS = 10_000
const KAKAO_SHARE_IMAGE_URL = 'https://mannayeok.kr/mannayeok-share-logo.png'

let sdkLoadingPromise = null

export function loadKakaoShareSdk() {
  const javascriptKey = import.meta.env.VITE_KAKAO_MAP_KEY

  if (!javascriptKey) {
    return Promise.reject(new Error('카카오 JavaScript 키가 설정되지 않았어요.'))
  }

  if (!sdkLoadingPromise) {
    sdkLoadingPromise = ensureKakaoShareScript()
      .then((Kakao) => initializeKakaoShareSdk(Kakao, javascriptKey))
      .catch((error) => {
        sdkLoadingPromise = null
        throw normalizeKakaoError(error)
      })
  }

  return sdkLoadingPromise
}

export function shareResultToKakao({ stationName, originNames, url }) {
  const Kakao = window.Kakao

  if (!Kakao?.Share || !Kakao.isInitialized()) {
    throw new Error('카카오톡 공유 SDK가 연결되지 않았어요.')
  }

  const link = isMobileShareEnvironment()
    ? { mobileWebUrl: url }
    : { webUrl: url }

  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: `만나역 추천: ${stationName}`,
      description: `${originNames}에서 만난다면? 만나기 좋은 중간역을 확인해보세요.`,
      imageUrl: KAKAO_SHARE_IMAGE_URL,
      imageWidth: 544,
      imageHeight: 544,
      link,
    },
  })
}

function isMobileShareEnvironment() {
  if (navigator.userAgentData?.mobile) return true

  const isMobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  const isTouchOnlyDevice = window.matchMedia?.('(hover: none) and (pointer: coarse)').matches

  return isMobileUserAgent || Boolean(isTouchOnlyDevice)
}

function ensureKakaoShareScript() {
  if (window.Kakao) {
    return Promise.resolve(window.Kakao)
  }

  document.getElementById(KAKAO_SHARE_SDK_ID)?.remove()

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    let settled = false

    const finish = (callback) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      script.onload = null
      script.onerror = null
      callback()
    }

    const timeoutId = window.setTimeout(() => {
      finish(() => {
        script.remove()
        reject(new Error('카카오 공유 SDK 응답 시간이 초과됐어요.'))
      })
    }, KAKAO_SHARE_LOAD_TIMEOUT_MS)

    script.id = KAKAO_SHARE_SDK_ID
    script.src = KAKAO_SHARE_SDK_URL
    script.async = true
    script.crossOrigin = 'anonymous'
    script.onload = () => {
      finish(() => {
        if (window.Kakao) {
          resolve(window.Kakao)
          return
        }

        reject(new Error('카카오 SDK 전역 객체를 찾지 못했어요.'))
      })
    }
    script.onerror = () => {
      finish(() => {
        script.remove()
        reject(new Error('카카오 공유 SDK 다운로드에 실패했어요.'))
      })
    }

    document.head.appendChild(script)
  })
}

function initializeKakaoShareSdk(Kakao, javascriptKey) {
  try {
    if (!Kakao.isInitialized()) {
      Kakao.init(javascriptKey)
    }

    if (!Kakao.isInitialized()) {
      throw new Error('카카오 JavaScript 키 초기화에 실패했어요.')
    }

    if (!Kakao.Share) {
      throw new Error('카카오 공유 모듈 초기화에 실패했어요.')
    }

    return Kakao
  } catch (error) {
    throw new Error(`카카오 SDK 초기화 실패: ${getErrorMessage(error)}`, { cause: error })
  }
}

function normalizeKakaoError(error) {
  return error instanceof Error ? error : new Error(getErrorMessage(error))
}

function getErrorMessage(error) {
  return error?.message || String(error || '알 수 없는 오류')
}
