import { useEffect, useMemo, useRef, useState } from 'react'
import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate'
import AddressInput from './components/AddressInput'
import { CheckCircle2, CircleHelp, Mail, Menu, MessageCircle, Send, Share2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import KakaoMap from './components/KakaoMap'
import MapDirections from './components/MapDirections'
import OnboardingScreen from './components/OnboardingScreen'
import PlaceList from './components/PlaceList'
import backgroundImage from './assets/background.png'
import logoImage from './assets/rogo.png'
import { getStationLines } from './data/subwayStationLines'
import { enrichOriginsWithNearbyStations, searchNearbyPlaces, searchRecommendedStations } from './services/kakaoApi'
import { loadKakaoShareSdk, shareResultToKakao } from './services/kakaoShare'
import { calculateDistanceInMeters, calculateMidpoint } from './services/midpointCalculator'

const PUBLIC_APP_URL = 'https://mannayeok.kr/'

const PLACE_CATEGORY_LABELS = {
  cafe: '카페',
  restaurant: '밥집',
  bar: '술집',
  activity: '놀거리',
}

const PLACE_CATEGORY_KEYS = ['cafe', 'restaurant', 'bar', 'activity']

const ICONS = {
  scales: '/phosphor-icons/scales-fill.svg',
  warning: '/phosphor-icons/warning-fill.svg',
  people: '/phosphor-icons/users-three-fill.svg',
  store: '/phosphor-icons/storefront-fill.svg',
  subway: '/phosphor-icons/subway-fill.svg',
  star: '/phosphor-icons/star-fill.svg',
  arrowRight: '/phosphor-icons/arrow-right.svg',
}

const ICON_TONES = {
  blue: {
    bg: 'bg-violet-50',
    badge: 'bg-violet-50 text-[#5A45E8]',
    filter: 'invert(36%) sepia(88%) saturate(1784%) hue-rotate(234deg) brightness(94%) contrast(95%)',
  },
  purple: {
    bg: 'bg-violet-50',
    badge: 'bg-violet-50 text-[#8A4FF5]',
    filter: 'invert(44%) sepia(93%) saturate(1437%) hue-rotate(236deg) brightness(97%) contrast(96%)',
  },
  green: {
    bg: 'bg-emerald-50',
    badge: 'bg-emerald-50 text-[#16A765]',
    filter: 'invert(49%) sepia(88%) saturate(472%) hue-rotate(105deg) brightness(91%) contrast(88%)',
  },
  amber: {
    bg: 'bg-amber-50',
    badge: 'bg-amber-50 text-amber-600',
    filter: 'invert(73%) sepia(76%) saturate(1474%) hue-rotate(359deg) brightness(96%) contrast(95%)',
  },
}

const MIN_ORIGIN_COUNT = 2
const MAX_ORIGIN_COUNT = 4
const LONG_DISTANCE_NOTICE_THRESHOLD_METERS = 80_000
const MIN_RECOMMENDATION_HOT_PLACE_COUNT = 50
const INQUIRY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyqk1NV6mSmOYtCL__PxAYtBxVJ8wE5usVISnbATiVv0OLzd9UOyFkI8Epiy9XjhWAS/exec'
const INQUIRY_COOLDOWN_MS = 60_000
const INQUIRY_TYPES = ['추천 오류', '역·상권 정보 오류', '기능 제안', '버그', '기타']

let nextOriginInputId = 0

const createEmptyOrigin = () => ({
  id: `origin-${nextOriginInputId++}`,
  query: '',
  selected: null,
})

function App() {
  const [sharedResult] = useState(readSharedResult)
  const [originInputs, setOriginInputs] = useState(
    () =>
      sharedResult?.origins?.length
        ? sharedResult.origins.map((origin) => ({
            id: createEmptyOrigin().id,
            query: origin.address,
            selected: origin,
          }))
        : Array.from({ length: MIN_ORIGIN_COUNT }, createEmptyOrigin),
  )
  const [origins, setOrigins] = useState(() => sharedResult?.origins || [])
  const [recommendedStations, setRecommendedStations] = useState(
    () => sharedResult?.recommendedStations || [],
  )
  const [fairStations, setFairStations] = useState(() => sharedResult?.fairStations || [])
  const [selectedStationId, setSelectedStationId] = useState(
    () => sharedResult?.selectedStationId || sharedResult?.recommendedStations?.[0]?.id || null,
  )
  const [places, setPlaces] = useState([])
  const [selectedPlaceCategory, setSelectedPlaceCategory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingDots, setLoadingDots] = useState('.')
  const [placeLoading, setPlaceLoading] = useState(false)
  const [error, setError] = useState('')
  const [placeError, setPlaceError] = useState('')
  const [helpTooltipActive, setHelpTooltipActive] = useState(false)
  const [mapCollapsed, setMapCollapsed] = useState(true)
  const [alternativeStationsCollapsed, setAlternativeStationsCollapsed] = useState(true)
  const [fairStationCollapsed, setFairStationCollapsed] = useState(true)
  const [hasStarted, setHasStarted] = useState(() => Boolean(sharedResult))
  const [isOnboardingLeaving, setIsOnboardingLeaving] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [serviceInfoOpen, setServiceInfoOpen] = useState(false)
  const [dataSourcesOpen, setDataSourcesOpen] = useState(false)
  const [resultShareOpen, setResultShareOpen] = useState(false)
  const [kakaoShareStatus, setKakaoShareStatus] = useState('idle')
  const [kakaoShareAttempt, setKakaoShareAttempt] = useState(0)
  const [kakaoShareError, setKakaoShareError] = useState('')
  const [shareNotice, setShareNotice] = useState('')
  const onboardingExitTimerRef = useRef(null)

  const selectableStations = useMemo(
    () => [...recommendedStations, ...fairStations],
    [recommendedStations, fairStations],
  )
  const selectedStation =
    selectableStations.find((station) => station.id === selectedStationId) || recommendedStations[0] || null
  const fairStation = fairStations[0] || null

  const mapStations = useMemo(() => {
    const stationMap = new Map()

    recommendedStations.forEach((station, index) => {
      stationMap.set(getStationMapKey(station), {
        ...station,
        mapLabel: index === 0 ? '추천' : `#${index}`,
      })
    })

    fairStations.slice(0, 1).forEach((station) => {
      const stationKey = getStationMapKey(station)

      if (!stationMap.has(stationKey)) {
        stationMap.set(stationKey, {
          ...station,
          mapLabel: '공평',
        })
      }
    })

    return [...stationMap.values()]
  }, [recommendedStations, fairStations])

  const selectedOrigins = originInputs.map((origin) => origin.selected).filter(Boolean)
  const hasRequiredSelections = selectedOrigins.length === originInputs.length
  const hasDuplicateOrigins = hasRequiredSelections && hasSameOrigins(selectedOrigins)
  const showResults = Boolean(selectedStation)
  const showLongDistanceNotice =
    showResults && getMaximumOriginDistance(origins) >= LONG_DISTANCE_NOTICE_THRESHOLD_METERS
  const primaryStation = recommendedStations[0] || null
  const alternativeStations = recommendedStations
    .slice(1)
    .filter((station) => station.hotPlaceCount >= MIN_RECOMMENDATION_HOT_PLACE_COUNT)
    .slice(0, 3)

  useEffect(() => {
    const cards = document.querySelectorAll('[data-reveal-root] > header, [data-reveal-root] section')

    if (!window.IntersectionObserver) {
      cards.forEach((card) => card.classList.add('is-visible'))
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.12,
      },
    )

    cards.forEach((card, index) => {
      card.classList.add('reveal-on-scroll')
      card.style.setProperty('--reveal-delay', `${Math.min(index * 45, 180)}ms`)
      observer.observe(card)
    })

    return () => observer.disconnect()
  }, [showResults, selectedStationId, selectedPlaceCategory])

  useEffect(() => {
    if (!loading) {
      setLoadingDots('.')
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setLoadingDots((dots) => (dots.length >= 3 ? '.' : `${dots}.`))
    }, 450)

    return () => window.clearInterval(intervalId)
  }, [loading])

  useEffect(() => {
    const handleOpenTooltip = () => setHelpTooltipActive(true)
    const handleCloseTooltip = () => setHelpTooltipActive(false)

    window.addEventListener('mannayeok:help-tooltip-open', handleOpenTooltip)
    window.addEventListener('mannayeok:help-tooltip-close', handleCloseTooltip)

    return () => {
      window.removeEventListener('mannayeok:help-tooltip-open', handleOpenTooltip)
      window.removeEventListener('mannayeok:help-tooltip-close', handleCloseTooltip)
    }
  }, [])

  useEffect(
    () => () => {
      if (onboardingExitTimerRef.current) {
        window.clearTimeout(onboardingExitTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (!shareNotice) return undefined

    const timeoutId = window.setTimeout(() => setShareNotice(''), 2200)
    return () => window.clearTimeout(timeoutId)
  }, [shareNotice])

  useEffect(() => {
    if (!resultShareOpen) return

    let active = true
    setKakaoShareStatus('loading')
    setKakaoShareError('')
    loadKakaoShareSdk()
      .then(() => {
        if (active) setKakaoShareStatus('ready')
      })
      .catch((error) => {
        if (active) {
          setKakaoShareStatus('error')
          setKakaoShareError(error instanceof Error ? error.message : '카카오 SDK 연결에 실패했어요.')
        }
      })

    return () => {
      active = false
    }
  }, [resultShareOpen, kakaoShareAttempt])

  useEffect(() => {
    if (
      !guideOpen &&
      !inquiryOpen &&
      !privacyOpen &&
      !serviceInfoOpen &&
      !dataSourcesOpen &&
      !resultShareOpen
    ) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (dataSourcesOpen) {
          setDataSourcesOpen(false)
        } else if (serviceInfoOpen) {
          setServiceInfoOpen(false)
        } else if (privacyOpen) {
          setPrivacyOpen(false)
        } else if (inquiryOpen) {
          setInquiryOpen(false)
        } else if (resultShareOpen) {
          setResultShareOpen(false)
        } else {
          setGuideOpen(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dataSourcesOpen, guideOpen, inquiryOpen, privacyOpen, resultShareOpen, serviceInfoOpen])

  const handleAddressChange = (index, value) => {
    setOriginInputs((prev) =>
      prev.map((origin, idx) =>
        idx === index
          ? {
              ...origin,
              query: value,
              selected: origin.selected?.address === value ? origin.selected : null,
            }
          : origin,
      ),
    )
  }

  const handleAddressSelect = (index, suggestion) => {
    const address = suggestion.roadAddress || suggestion.address
    const duplicateOrigin = originInputs.find(
      (origin, idx) => idx !== index && origin.selected && isSameOrigin(origin.selected, suggestion),
    )

    if (duplicateOrigin) {
      setError('서로 다른 출발지를 선택해주세요.')
      return
    }

    setOriginInputs((prev) =>
      prev.map((origin, idx) =>
        idx === index
          ? {
              ...origin,
              query: address,
              selected: {
                address,
                id: suggestion.id,
                lat: suggestion.lat,
                lng: suggestion.lng,
                routeName: suggestion.routeName || address,
              },
            }
          : origin,
      ),
    )
    setError('')
  }

  const handleAddOrigin = () => {
    if (originInputs.length >= MAX_ORIGIN_COUNT) return

    setOriginInputs((prev) => [...prev, createEmptyOrigin()])
    clearSearchResults()
  }

  const handleRemoveOrigin = (index) => {
    if (originInputs.length <= MIN_ORIGIN_COUNT) return

    setOriginInputs((prev) => prev.filter((_, idx) => idx !== index))
    clearSearchResults()
  }

  const handleResetSearch = () => {
    setOriginInputs(Array.from({ length: MIN_ORIGIN_COUNT }, createEmptyOrigin))
    clearSearchResults()
    setPlaceError('')
  }

  const clearSearchResults = () => {
    setOrigins([])
    setRecommendedStations([])
    setFairStations([])
    setSelectedStationId(null)
    setPlaces([])
    setSelectedPlaceCategory(null)
    setError('')
  }

  const handleCalculate = async () => {
    if (!hasRequiredSelections) {
      setError(`${originInputs.length}개 출발지를 모두 검색 결과에서 선택해주세요.`)
      return
    }

    if (hasDuplicateOrigins) {
      setError('같은 출발지는 계산할 수 없어요. 서로 다른 출발지를 선택해주세요.')
      return
    }

    setLoading(true)
    setError('')
    setPlaceError('')

    try {
      const enrichedOrigins = await enrichOriginsWithNearbyStations(selectedOrigins)
      const center = calculateMidpoint(enrichedOrigins)
      const recommendation = await searchRecommendedStations(center, enrichedOrigins, 4)
      const stations = Array.isArray(recommendation) ? recommendation : recommendation.meetingStations
      const fairResults = Array.isArray(recommendation) ? [] : recommendation.fairStations

      if (!stations.length) {
        throw new Error('계산된 중간 지점 주변에서 추천역을 찾지 못했습니다.')
      }

      setOrigins(enrichedOrigins)
      setRecommendedStations(stations)
      setFairStations(fairResults)
      setSelectedStationId(stations[0].id)
      setPlaces([])
      setSelectedPlaceCategory(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '추천 중간역 계산 중 문제가 발생했습니다.')
      setOrigins([])
      setRecommendedStations([])
      setFairStations([])
      setSelectedStationId(null)
      setPlaces([])
      setSelectedPlaceCategory(null)
    } finally {
      setLoading(false)
    }
  }

  const handleStationSelect = (stationId) => {
    setSelectedStationId(stationId)
    setPlaces([])
    setSelectedPlaceCategory(null)
    setPlaceError('')
  }

  const handlePlaceRecommendation = async (category) => {
    if (!selectedStation) return

    setPlaceLoading(true)
    setPlaceError('')

    try {
      const nearbyPlaces =
        category === 'all'
          ? await searchAllNearbyPlaces(selectedStation)
          : await searchPlacesWithCategory(selectedStation, category)

      setPlaces(nearbyPlaces)
      setSelectedPlaceCategory(category)
    } catch (e) {
      setPlaceError(e instanceof Error ? e.message : '근처 장소 추천 중 문제가 발생했습니다.')
      setPlaces([])
      setSelectedPlaceCategory(category)
    } finally {
      setPlaceLoading(false)
    }
  }

  const handleStartApp = () => {
    if (isOnboardingLeaving) return

    setIsOnboardingLeaving(true)
    onboardingExitTimerRef.current = window.setTimeout(() => {
      setHasStarted(true)
    }, 560)
  }

  const getResultShareData = () => {
    if (!primaryStation) return

    const shareUrl = createResultShareUrl({
      origins,
      recommendedStations,
      fairStations,
      selectedStationId,
    })
    const originNames = origins.map((origin) => origin.routeName || origin.address).join(' · ')
    return {
      title: `만나역 추천 결과 - ${primaryStation.name}`,
      text: `${originNames}에서 만나기 좋은 역은 ${primaryStation.name}이에요.`,
      url: shareUrl,
    }
  }

  const handleResultShare = () => {
    if (!primaryStation) return
    setResultShareOpen(true)
  }

  const handleResultKakaoShare = () => {
    const shareData = getResultShareData()
    if (!shareData) return

    if (kakaoShareStatus !== 'ready') {
      if (kakaoShareStatus === 'error') {
        setKakaoShareAttempt((attempt) => attempt + 1)
        return
      }

      setShareNotice(
        '카카오톡 공유 기능을 준비하고 있어요.',
      )
      return
    }

    try {
      shareResultToKakao({
        stationName: primaryStation.name,
        originNames: origins.map((origin) => origin.routeName || origin.address).join(' · '),
        url: shareData.url,
      })
      setResultShareOpen(false)
    } catch (error) {
      const kakaoErrorMessage =
        error instanceof Error ? error.message : error?.message || '카카오톡 공유를 열지 못했어요.'

      setShareNotice(kakaoErrorMessage)
    }
  }

  const handleInquiry = () => {
    setInquiryOpen(true)
    setMobileMenuOpen(false)
  }

  const handleInquirySubmit = async ({ type, message, replyEmail, website }) => {
    const lastSubmittedAt = getLastInquirySubmittedAt()
    const elapsedTime = Date.now() - lastSubmittedAt

    if (lastSubmittedAt && elapsedTime < INQUIRY_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((INQUIRY_COOLDOWN_MS - elapsedTime) / 1000)
      throw new Error(`${remainingSeconds}초 후에 다시 보낼 수 있어요.`)
    }

    const alternativeStationNames = selectableStations
      .filter((station) => station.id !== selectedStation?.id)
      .slice(0, 4)
      .map((station) => station.name)
      .join(', ')
    const body = new URLSearchParams({
      type,
      message,
      replyEmail,
      website,
      origins: origins.map((origin) => origin.routeName || origin.address).join(' / '),
      recommendedStation: selectedStation?.name || '',
      alternativeStations: alternativeStationNames,
      pageUrl: `${window.location.origin}${window.location.pathname}`,
      browser: navigator.userAgent,
      appVersion: import.meta.env.VITE_APP_VERSION || 'beta',
    })

    await fetch(INQUIRY_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body,
      keepalive: true,
    })

    setLastInquirySubmittedAt(Date.now())
  }

  if (!hasStarted) {
    return <OnboardingScreen onStart={handleStartApp} isLeaving={isOnboardingLeaving} />
  }

  return (
    <main
      className="app-enter min-h-screen overflow-x-hidden bg-[#F8FAFC] px-2.5 py-3 md:px-6 md:pb-6 md:pt-4"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(248,250,252,0.80) 0%, rgba(248,250,252,0.54) 50%, rgba(248,250,252,0.86) 100%), url(${backgroundImage})`,
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      <div data-reveal-root className="mx-auto w-full max-w-4xl space-y-4 pb-8 md:space-y-5">
        <div className="mx-auto w-full max-w-4xl space-y-2 md:space-y-3">
          <div className="relative flex min-h-16 items-start justify-between px-0 py-0 md:min-h-20">
            <div className="relative flex min-w-0 items-start">
              <span className="block h-16 w-44 overflow-visible sm:w-64 md:h-20 md:w-72" aria-label="만나역" role="img">
                <img
                  src={logoImage}
                  alt=""
                  className="h-full w-full origin-left -translate-x-7 translate-y-1 scale-[1.6] object-contain object-left sm:-translate-x-10 sm:scale-[1.95] md:-translate-x-11 md:translate-y-1.5 md:scale-[2.15]"
                />
              </span>
              <BetaBadge className="absolute left-24 top-3 md:left-36 md:top-4" />
            </div>

            <nav className="mt-5 hidden shrink-0 items-center gap-1 md:flex" aria-label="서비스 메뉴">
              <HeaderAction icon={Mail} label="문의하기" onClick={handleInquiry} />
              <HeaderAction icon={CircleHelp} label="이용안내" onClick={() => setGuideOpen(true)} />
            </nav>

            <div className="relative mt-2.5 flex shrink-0 items-center gap-1 md:hidden">
              <HeaderIconButton
                icon={mobileMenuOpen ? X : Menu}
                label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
                onClick={() => setMobileMenuOpen((open) => !open)}
              />
              {mobileMenuOpen ? (
                <div className="absolute right-0 top-11 z-[120] w-40 overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl">
                  <MobileMenuAction icon={Mail} label="문의하기" onClick={handleInquiry} />
                  <MobileMenuAction
                    icon={CircleHelp}
                    label="이용안내"
                    onClick={() => {
                      setGuideOpen(true)
                      setMobileMenuOpen(false)
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <header className="hidden">
            <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-5 py-4 md:px-8 md:py-5">
              <div className="flex items-center gap-2.5">
                <MannayeokLogo />
                <p className="text-lg font-black tracking-tight text-slate-950">mannayeok</p>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-4xl px-5 pb-9 pt-5 md:px-8 md:pb-12 md:pt-8">
              <div className="absolute right-4 top-2 hidden h-px w-64 rotate-[-38deg] bg-violet-100 md:block" />
              <div className="absolute -right-8 bottom-8 hidden h-44 w-44 rounded-full border-[12px] border-white/70 md:block" />
              <div className="absolute right-10 bottom-20 hidden h-px w-64 rotate-[-38deg] bg-indigo-100 md:block" />
              <div className="relative grid items-center gap-5 lg:grid-cols-[1fr_1.05fr]">
                <div className="min-w-0">
                  <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#5A45E8] shadow-sm ring-1 ring-indigo-100">
                    약속역 추천
                  </span>
                  <h1 className="mt-4 text-[26px] font-black leading-tight tracking-tight text-slate-950 md:text-4xl">
                    어디서 만날지 고민 끝,
                    <span className="block text-[#5A45E8]">만나기 좋은 역을 찾아드려요</span>
                  </h1>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                    위치 균형, 주변 상권, 노선 접근성까지 고려해 모두에게 부담 적은 약속역을 추천해드려요.
                  </p>
                </div>

                <HeroFeatureGrid />
              </div>
            </div>
          </header>

          <section id="origin-input" className="relative z-[80] scroll-mt-6 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:p-5">
            <AddressInput
              origins={originInputs}
              maxOrigins={MAX_ORIGIN_COUNT}
              minOrigins={MIN_ORIGIN_COUNT}
              onAddOrigin={handleAddOrigin}
              onChange={handleAddressChange}
              onRemoveOrigin={handleRemoveOrigin}
              onReset={handleResetSearch}
              onSelect={handleAddressSelect}
            />

            <button
              type="button"
              onClick={handleCalculate}
              disabled={loading}
              className="mt-3 w-full rounded-2xl bg-[#5A45E8] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(90,69,232,0.28)] transition hover:bg-[#4938D1] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-violet-200 disabled:shadow-none sm:mt-3.5 sm:py-4 sm:text-base"
            >
              {loading ? `추천 후보를 찾는 중${loadingDots}` : '만나기 좋은 역 찾기'}
            </button>

            {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p> : null}
          </section>
        </div>

        {showResults ? (
          <>
            {showLongDistanceNotice ? (
              <aside
                role="note"
                className="rounded-xl border border-violet-100 bg-gradient-to-r from-[#F7F5FF] to-white px-3 py-2.5 shadow-[0_6px_18px_rgba(90,69,232,0.05)] md:px-4"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-violet-100">
                    <Icon
                      name="warning"
                      className="h-4 w-4"
                      style={{ filter: ICON_TONES.amber.filter, opacity: 0.78 }}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-[#5A45E8]">장거리 참고 추천</p>
                    <p className="mt-0.5 break-keep text-xs font-semibold leading-[1.15rem] text-slate-500">
                      출발지 간 거리가 멀어 지리적 균형과 주변 상권을 중심으로 추천했어요. 실제
                      이동시간은 노선과 환승 경로에 따라 달라질 수 있습니다.
                    </p>
                  </div>
                </div>
              </aside>
            ) : null}

            {primaryStation ? (
              <section
                className={`relative grid items-start gap-3 ${
                  fairStation ? 'lg:grid-cols-[1.08fr_0.92fr]' : 'lg:grid-cols-1'
                } ${helpTooltipActive ? 'z-[120]' : 'z-40'}`}
              >
                <div className="relative">
                  <ResultTypeCard
                    station={primaryStation}
                    selected={primaryStation.id === selectedStation.id}
                    onClick={() => handleStationSelect(primaryStation.id)}
                    primary
                  />
                  <button
                    type="button"
                    onClick={handleResultShare}
                    className="absolute right-3 top-3 z-10 inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-white/95 px-2.5 text-[11px] font-black text-[#5A45E8] shadow-sm backdrop-blur transition hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  >
                    <Share2 className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                    <span>결과 공유</span>
                  </button>
                </div>
                {fairStation ? (
                  <>
                    <MobileFairStationCard
                      station={fairStation}
                      collapsed={fairStationCollapsed}
                      onToggle={() => setFairStationCollapsed((collapsed) => !collapsed)}
                    />
                    <div className="hidden lg:block">
                      <ResultTypeCard
                        station={fairStation}
                        selected={fairStation.id === selectedStation.id}
                        onClick={() => handleStationSelect(fairStation.id)}
                      />
                    </div>
                  </>
                ) : null}
              </section>
            ) : null}

            {alternativeStations.length ? (
              <section className="rounded-2xl border border-slate-100 bg-white/92 p-3.5 shadow-sm backdrop-blur md:p-4">
                <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-lg font-black text-slate-950 md:text-base">
                      다른 추천 후보 TOP3
                    </h2>
                    <p className="mt-1 hidden text-xs leading-5 text-slate-500 md:block">
                      탭하면 지도와 길찾기 기준역이 바뀌어요. 각 역의 특성을 비교해보세요.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAlternativeStationsCollapsed((collapsed) => !collapsed)}
                    className="hidden"
                    aria-expanded={!alternativeStationsCollapsed}
                  >
                    <span className="text-xs">{alternativeStationsCollapsed ? '후보 열기' : '후보 접기'}</span>
                    {alternativeStationsCollapsed ? '후보 열기' : '후보 접기'}
                  </button>
                </div>
                <div className="grid gap-3 md:hidden">
                  {alternativeStations.map((station, index) => (
                    <div key={station.id}>
                      <StationCard
                        station={{
                          ...station,
                          rank: index + 2,
                        }}
                        selected={station.id === selectedStation.id}
                        onClick={() => handleStationSelect(station.id)}
                      />
                    </div>
                  ))}
                </div>
                <div className="hidden gap-3 md:grid md:grid-cols-3">
                  {alternativeStations.map((station, index) => (
                    <StationCard
                      key={station.id}
                      station={{
                        ...station,
                        rank: index + 2,
                      }}
                      selected={station.id === selectedStation.id}
                      onClick={() => handleStationSelect(station.id)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:p-4">
              <div className={`${mapCollapsed ? '' : 'mb-3'} flex items-center justify-between gap-3`}>
                <h2 className="text-base font-bold text-slate-950">지도에서 거리보기</h2>
                <button
                  type="button"
                  onClick={() => setMapCollapsed((collapsed) => !collapsed)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-[#5A45E8]"
                  aria-expanded={!mapCollapsed}
                >
                  {mapCollapsed ? '지도 열기' : '지도 접기'}
                </button>
              </div>
              {!mapCollapsed ? (
                <KakaoMap origins={origins} meetingPoint={selectedStation} meetingPoints={mapStations} />
              ) : null}
            </section>

            <MapDirections origins={origins} station={selectedStation} />

            <section id="places" className="rounded-2xl border border-slate-100 bg-white/95 px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur md:px-5 md:py-5">
              <div className="space-y-3.5">
                <div>
                  <p className="text-sm font-black text-[#5A45E8]">
                    {selectedStation.name} 근처 약속 장소
                  </p>
                  <h2 className="mt-1 break-keep text-lg font-black tracking-tight text-slate-950 md:text-xl">
                    어디에서 만날까요?
                  </h2>
                  <p className="mt-1.5 max-w-sm text-xs font-medium leading-5 text-slate-500 md:text-sm md:leading-5">
                    카페, 식당, 술집, 놀거리 중 원하는 카테고리를 선택해보세요.
                  </p>
                </div>

                <div className="ml-2 inline-flex max-w-full gap-7 overflow-x-auto border-y border-slate-100 pr-2 [scrollbar-width:none] md:ml-3 md:gap-9 md:pr-3 [&::-webkit-scrollbar]:hidden">
                  {PLACE_CATEGORY_KEYS.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handlePlaceRecommendation(category)}
                      disabled={placeLoading}
                      className={`relative shrink-0 py-3 text-[15px] font-black leading-none transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60 ${
                        selectedPlaceCategory === category
                          ? 'text-[#5A45E8] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-[#5A45E8] after:transition-all after:duration-200'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {getPlaceTabLabel(category)}
                    </button>
                  ))}
                </div>

                {!selectedPlaceCategory ? (
                  <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500 md:text-sm">
                    카테고리를 선택하면 가까운 순서로 장소를 보여드려요.
                  </p>
                ) : null}
                {placeError ? <p className="text-sm text-red-500">{placeError}</p> : null}
                {selectedPlaceCategory && !placeLoading && !placeError && !places.length ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    근처 {PLACE_CATEGORY_LABELS[selectedPlaceCategory]} 검색 결과가 없어요. 다른 카테고리를 골라보세요.
                  </p>
                ) : null}
              </div>
            </section>

            {selectedPlaceCategory && places.length ? (
              <PlaceList
                places={places}
                meetingPointName={selectedStation.name}
                placeCategoryLabel={PLACE_CATEGORY_LABELS[selectedPlaceCategory]}
              />
            ) : null}
          </>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center md:px-5 md:py-8">
            <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 md:mb-3 md:h-12 md:w-12">
              <div className="h-4 w-4 rounded-full border-[3px] border-[#5A45E8] bg-white shadow-sm md:h-5 md:w-5 md:border-4" />
            </div>
            <h2 className="text-[15px] font-black text-slate-950 md:text-base">어디서 만날까요?</h2>
            <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-5 text-slate-500 md:text-sm md:leading-6">
              출발지 사이의 위치 균형과 주변 상권을 함께 보고, 만나기 좋은 역을 추천해드려요.
            </p>
          </section>
        )}

        <footer className="mt-1 border-t border-slate-200/80 px-2 pb-1 pt-3 text-center text-[10px] font-bold text-slate-400 md:mt-2 md:pb-2 md:pt-4 md:text-[11px]">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span>© 2026 만나역</span>
            <button
              type="button"
              onClick={() => setServiceInfoOpen(true)}
              className="transition hover:text-[#5A45E8]"
            >
              서비스 이용안내
            </button>
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="transition hover:text-[#5A45E8]"
            >
              개인정보처리방침
            </button>
            <button
              type="button"
              onClick={() => setDataSourcesOpen(true)}
              className="transition hover:text-[#5A45E8]"
            >
              데이터 출처
            </button>
            <button
              type="button"
              onClick={handleInquiry}
              className="transition hover:text-[#5A45E8]"
            >
              문의하기
            </button>
          </div>
          <p className="mt-2 font-medium text-slate-400">
            국토교통부·서울교통공사 공공데이터와 카카오맵 API를 활용합니다.
          </p>
          <p className="mt-2 font-medium text-slate-400">운영 문의: 1rkdwlgns1@gmail.com</p>
        </footer>
      </div>

      {guideOpen
        ? createPortal(<UsageGuideDialog onClose={() => setGuideOpen(false)} />, document.body)
        : null}
      {inquiryOpen ? (
        createPortal(
          <InquiryDialog
            hasResult={Boolean(selectedStation)}
            onClose={() => setInquiryOpen(false)}
            onOpenPrivacy={() => setPrivacyOpen(true)}
            onSubmit={handleInquirySubmit}
          />,
          document.body,
        )
      ) : null}
      {privacyOpen
        ? createPortal(<PrivacyPolicyDialog onClose={() => setPrivacyOpen(false)} />, document.body)
        : null}
      {serviceInfoOpen
        ? createPortal(
            <FooterInfoDialog type="service" onClose={() => setServiceInfoOpen(false)} />,
            document.body,
          )
        : null}
      {dataSourcesOpen
        ? createPortal(
            <FooterInfoDialog type="sources" onClose={() => setDataSourcesOpen(false)} />,
            document.body,
          )
        : null}
      {resultShareOpen
        ? createPortal(
            <ResultShareDialog
              stationName={primaryStation?.name || ''}
              originNames={origins.map((origin) => origin.routeName || origin.address)}
              kakaoShareStatus={kakaoShareStatus}
              kakaoShareError={kakaoShareError}
              onKakaoShare={handleResultKakaoShare}
              onClose={() => setResultShareOpen(false)}
            />,
            document.body,
          )
        : null}

      {shareNotice
        ? createPortal(
            <div
              className="fixed bottom-5 left-1/2 z-[160] -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-xl"
              role="status"
            >
              {shareNotice}
            </div>,
            document.body,
          )
        : null}
    </main>
  )
}

function HeaderAction({ icon: ActionIcon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-black text-slate-600 transition hover:bg-white hover:text-[#5A45E8] hover:shadow-sm"
    >
      <ActionIcon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}

function HeaderIconButton({ icon: ActionIcon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-[#5A45E8]"
      aria-label={label}
      title={label}
    >
      <ActionIcon className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
    </button>
  )
}

function MobileMenuAction({ icon: ActionIcon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-[#5A45E8]"
    >
      <ActionIcon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
      {label}
    </button>
  )
}

function ResultShareDialog({
  stationName,
  originNames,
  kakaoShareStatus,
  kakaoShareError,
  onKakaoShare,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-share-title"
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div>
            <p className="text-xs font-black text-[#5A45E8]">결과 공유</p>
            <h2 id="result-share-title" className="mt-1 text-xl font-black text-slate-950">
              약속 장소를 같이 정해보세요
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">친구가 같은 추천 결과를 바로 확인할 수 있어요.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="공유창 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mx-5 rounded-xl border border-violet-100 bg-violet-50/60 p-4 sm:mx-6">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500">
            {originNames.map((originName, index) => (
              <span key={`${originName}-${index}`} className="rounded-md bg-white px-2 py-1 shadow-sm">
                {originName}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-end justify-between gap-4 border-t border-violet-100 pt-3">
            <div>
              <p className="text-[11px] font-bold text-slate-400">만나역 추천</p>
              <p className="mt-0.5 text-2xl font-black text-slate-950">{stationName}</p>
            </div>
            <span className="rounded-lg bg-[#5A45E8] px-2.5 py-1.5 text-xs font-black text-white">최적 추천역</span>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <button
            type="button"
            onClick={onKakaoShare}
            disabled={kakaoShareStatus === 'loading'}
            className="flex min-h-16 w-full items-center gap-3 rounded-xl bg-[#FEE500] px-4 py-3 text-left text-[#191919] shadow-[0_10px_24px_rgba(254,229,0,0.22)] transition hover:bg-[#F5DC00] active:scale-[0.99] disabled:cursor-wait disabled:bg-[#FFF4A8] disabled:text-black/45 disabled:shadow-none"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/10">
              <MessageCircle className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black">
                {kakaoShareStatus === 'loading'
                  ? '카카오톡 연결 중'
                  : kakaoShareStatus === 'error'
                    ? '카카오톡 다시 연결'
                    : '카카오톡으로 결과 보내기'}
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-black/55">
                친구에게 같은 추천 결과를 공유해요
              </span>
            </span>
          </button>
        </div>
        {kakaoShareStatus === 'error' ? (
          <p className="mx-5 -mt-2 mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-600 sm:mx-6">
            {kakaoShareError}
          </p>
        ) : null}
        <div className="border-t border-slate-100 px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-full rounded-lg text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            취소
          </button>
        </div>
      </section>
    </div>
  )
}

function InquiryDialog({ hasResult, onClose, onOpenPrivacy, onSubmit }) {
  const [type, setType] = useState(hasResult ? '추천 오류' : '기능 제안')
  const [message, setMessage] = useState('')
  const [replyEmail, setReplyEmail] = useState('')
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [status, setStatus] = useState({ phase: 'idle', message: '' })

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (status.phase === 'sending') return
    if (!privacyConsent) {
      setStatus({ phase: 'error', message: '개인정보 수집 및 이용에 동의해주세요.' })
      return
    }

    const formData = new FormData(event.currentTarget)
    setStatus({ phase: 'sending', message: '' })

    try {
      await onSubmit({
        type,
        message: message.trim(),
        replyEmail: replyEmail.trim(),
        website: String(formData.get('website') || ''),
      })
      setStatus({ phase: 'success', message: '소중한 의견을 보내주셔서 감사해요.' })
    } catch (error) {
      setStatus({
        phase: 'error',
        message: error instanceof Error ? error.message : '문의 전송에 실패했어요. 다시 시도해주세요.',
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-slate-950/35 px-4 pb-4 pt-4 backdrop-blur-[2px] md:pt-10"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && status.phase !== 'sending') onClose()
      }}
    >
      <section
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/60 bg-white p-4 shadow-2xl md:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-dialog-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-[#5A45E8]">개발자에게 문의하기</p>
            <h2 id="inquiry-dialog-title" className="mt-1 text-xl font-black tracking-tight text-slate-950">
              만나역을 더 좋게 만들어주세요
            </h2>
            <p className="mt-1 break-keep text-xs leading-5 text-slate-500">
              불편했던 점이나 개선 아이디어를 남겨주시면 확인할게요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={status.phase === 'sending'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
            aria-label="문의하기 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {status.phase === 'success' ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-950">문의가 접수됐어요</h3>
            <p className="mt-1 text-sm text-slate-500">{status.message}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 h-11 w-full rounded-xl bg-[#5A45E8] text-sm font-black text-white transition hover:bg-[#4D39D4]"
            >
              닫기
            </button>
          </div>
        ) : (
          <form className="mt-4" onSubmit={handleSubmit}>
            <fieldset>
              <legend className="text-sm font-black text-slate-800">문의 유형</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {INQUIRY_TYPES.map((inquiryType) => (
                  <label
                    key={inquiryType}
                    className={`flex min-h-10 cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-bold transition ${
                      type === inquiryType
                        ? 'border-violet-300 bg-violet-50 text-[#5A45E8]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={inquiryType}
                      checked={type === inquiryType}
                      onChange={() => setType(inquiryType)}
                      className="sr-only"
                    />
                    {inquiryType}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-4 block text-sm font-black text-slate-800" htmlFor="inquiry-message">
              문의 내용
            </label>
            <textarea
              id="inquiry-message"
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              minLength={1}
              maxLength={250}
              rows={4}
              placeholder="불편했던 점이나 개선했으면 하는 내용을 적어주세요."
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
            />
            <p className="mt-1 text-right text-[11px] font-medium text-slate-400">{message.length}/250</p>

            <label className="mt-3 block text-sm font-black text-slate-800" htmlFor="inquiry-email">
              답변받을 이메일 <span className="font-medium text-slate-400">(선택)</span>
            </label>
            <input
              id="inquiry-email"
              name="replyEmail"
              type="email"
              value={replyEmail}
              onChange={(event) => setReplyEmail(event.target.value)}
              maxLength={200}
              placeholder="답변이 필요한 경우에만 입력해주세요."
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
            />

            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="inquiry-website">웹사이트</label>
              <input id="inquiry-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            {hasResult ? (
              <p className="mt-4 rounded-xl bg-violet-50 px-3 py-2 text-[11px] font-bold leading-5 text-[#7868C8]">
                현재 출발지와 추천 결과가 문의에 자동으로 첨부돼요.
              </p>
            ) : null}

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(event) => setPrivacyConsent(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#5A45E8]"
                  required
                />
                <span className="text-xs font-black leading-5 text-slate-700">
                  [필수] 개인정보 수집 및 이용에 동의합니다.
                </span>
              </label>
              <div className="ml-6 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-slate-500">
                <span>문의·검색·접속 정보</span>
                <span aria-hidden="true">·</span>
                <span>접수일로부터 1년 보관</span>
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="font-black text-[#5A45E8] underline underline-offset-2"
                >
                  전문 보기
                </button>
              </div>
            </div>

            {status.phase === 'error' ? (
              <p className="mt-3 text-sm font-bold text-red-500" role="alert">
                {status.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={status.phase === 'sending' || !privacyConsent}
              className="sticky bottom-0 mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#5A45E8] text-sm font-black text-white shadow-[0_-8px_18px_rgba(255,255,255,0.96)] transition hover:bg-[#4D39D4] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {status.phase === 'sending' ? '보내는 중...' : '문의 보내기'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

function FooterInfoDialog({ type, onClose }) {
  const isSources = type === 'sources'
  const title = isSources ? '데이터 출처' : '서비스 이용안내'
  const titleId = isSources ? 'data-sources-title' : 'service-info-title'

  return (
    <div
      className="fixed inset-0 z-[170] flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 pb-4 pt-4 backdrop-blur-[2px] md:pt-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/60 bg-white p-5 shadow-2xl md:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-black text-[#5A45E8]">만나역</p>
            <h2 id={titleId} className="mt-1 text-xl font-black tracking-tight text-slate-950 md:text-2xl">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label={`${title} 닫기`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {isSources ? <DataSourcesContent /> : <ServiceInfoContent />}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-xl bg-[#5A45E8] text-sm font-black text-white transition hover:bg-[#4D39D4]"
        >
          확인했어요
        </button>
      </section>
    </div>
  )
}

function ServiceInfoContent() {
  return (
    <div className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
      <PrivacyPolicySection title="1. 추천 결과 안내">
        <p>만나역은 출발지 간 거리 균형, 교통 접근성 및 주변 상권을 종합해 만나기 좋은 역을 추천합니다.</p>
        <p>추천 결과는 약속 장소 선택을 돕기 위한 참고 정보이며, 특정 이동 경로나 장소의 최적성을 보장하지 않습니다.</p>
      </PrivacyPolicySection>
      <PrivacyPolicySection title="2. 실제 정보와의 차이">
        <p>이동시간, 운행 노선, 환승 경로와 장소 정보는 교통 상황, 운행 변경 및 외부 데이터 갱신 시점에 따라 실제와 다를 수 있습니다.</p>
        <p>중요한 약속 전에는 연결된 지도와 해당 교통 운영기관의 최신 정보를 함께 확인해주세요.</p>
      </PrivacyPolicySection>
      <PrivacyPolicySection title="3. 서비스 변경 및 문의">
        <p>서비스 품질 개선을 위해 추천 기준과 제공 기능은 변경될 수 있습니다.</p>
        <p>
          오류 제보와 이용 문의는 서비스 내 문의하기 또는{' '}
          <a href="mailto:1rkdwlgns1@gmail.com" className="font-bold text-[#5A45E8] underline underline-offset-2">
            1rkdwlgns1@gmail.com
          </a>
          으로 보내주세요.
        </p>
      </PrivacyPolicySection>
    </div>
  )
}

function DataSourcesContent() {
  const linkClass = 'font-bold text-[#5A45E8] underline underline-offset-2'

  return (
    <>
      <p className="mt-5 break-keep text-sm leading-6 text-slate-600">
        만나역은 아래 공공데이터와 외부 API를 가공해 추천 및 지도 정보를 제공합니다.
      </p>
      <div className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
        <PrivacyPolicySection title="공공데이터">
          <ul className="list-disc space-y-2 pl-5">
            <li>국토교통부 도시철도 전체노선</li>
            <li>
              <a
                href="https://data.seoul.go.kr/dataList/OA-15442/A/1/datasetView.do"
                target="_blank"
                rel="noreferrer"
                className={linkClass}
              >
                서울교통공사 노선별 지하철역 정보
              </a>
            </li>
            <li>
              <a
                href="https://data.seoul.go.kr/dataList/OA-12034/S/1/datasetView.do"
                target="_blank"
                rel="noreferrer"
                className={linkClass}
              >
                서울교통공사 역간거리 및 소요시간
              </a>
            </li>
            <li>서울특별시 철도역 구간</li>
          </ul>
          <p>공공데이터는 출처표시 조건에 따라 가공·활용되며, 원 제공기관의 최신 자료와 차이가 있을 수 있습니다.</p>
        </PrivacyPolicySection>
        <PrivacyPolicySection title="외부 API">
          <ul className="list-disc space-y-2 pl-5">
            <li>카카오맵·카카오 Local API: 주소 검색, 역 좌표, 지도 및 주변 장소 정보</li>
            <li>카카오 Mobility API: 출발지와 추천역 간 경로 및 이동시간 정보</li>
          </ul>
          <a
            href="https://developers.kakao.com/docs/ko/kakaomap/common"
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          >
            카카오맵 API 안내 보기
          </a>
        </PrivacyPolicySection>
        <PrivacyPolicySection title="데이터 이용 안내">
          <p>상권 지표는 역 주변의 카페, 음식점 및 편의·문화시설 검색 결과를 만나역의 기준으로 가공한 참고 지표입니다.</p>
          <p>데이터의 저작권과 권리는 각 제공기관에 있으며, 만나역은 각 제공기관을 대표하거나 보증하지 않습니다.</p>
        </PrivacyPolicySection>
      </div>
    </>
  )
}

function PrivacyPolicyDialog({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[170] flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 pb-4 pt-4 backdrop-blur-[2px] md:pt-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/60 bg-white p-5 shadow-2xl md:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-policy-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-black text-[#5A45E8]">만나역</p>
            <h2 id="privacy-policy-title" className="mt-1 text-xl font-black tracking-tight text-slate-950 md:text-2xl">
              개인정보처리방침
            </h2>
            <p className="mt-1 text-xs text-slate-400">시행일: 2026년 7월 22일</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="개인정보처리방침 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-5 break-keep text-sm leading-6 text-slate-600">
          만나역은 문의 처리와 서비스 개선에 필요한 최소한의 개인정보만 처리하며, 관련 정보를 안전하게 관리하기 위해 노력합니다.
        </p>

        <div className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
          <PrivacyPolicySection title="1. 처리 목적 및 항목">
            <p><strong>처리 목적:</strong> 문의 접수·확인, 추천 및 상권 정보 오류 분석, 서비스 개선, 답변 제공</p>
            <p><strong>필수 항목:</strong> 문의 유형과 내용, 출발지, 추천역과 후보역, 접속 페이지 주소, 브라우저 정보, 접수 시각</p>
            <p><strong>선택 항목:</strong> 답변받을 이메일 주소</p>
          </PrivacyPolicySection>

          <PrivacyPolicySection title="2. 보유 및 이용 기간">
            <p>문의 정보는 접수일로부터 1년 동안 보관한 뒤 지체 없이 삭제합니다.</p>
            <p>이용자가 삭제를 요청하거나 처리 목적이 먼저 달성된 경우에는 확인 후 지체 없이 삭제합니다.</p>
          </PrivacyPolicySection>

          <PrivacyPolicySection title="3. 개인정보 처리와 외부 서비스">
            <p>만나역은 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.</p>
            <p>문의 저장과 시스템 운영을 위해 Google Apps Script 및 Google Sheets를 이용하며, 이 과정에서 Google LLC의 인프라를 통해 정보가 처리될 수 있습니다.</p>
            <a
              href="https://policies.google.com/privacy?hl=ko"
              target="_blank"
              rel="noreferrer"
              className="inline-block font-bold text-[#5A45E8] underline underline-offset-2"
            >
              Google 개인정보처리방침 보기
            </a>
          </PrivacyPolicySection>

          <PrivacyPolicySection title="4. 파기 절차 및 방법">
            <p>보유기간이 끝난 문의는 관리 중인 Google Sheet에서 삭제하며, 별도 보관본이 있는 경우에도 같은 기준으로 삭제합니다.</p>
            <p>전자적 파일은 복구하기 어려운 방법으로 삭제합니다.</p>
          </PrivacyPolicySection>

          <PrivacyPolicySection title="5. 이용자의 권리">
            <p>이용자는 자신의 개인정보에 대해 열람, 정정, 삭제 및 처리정지를 요청할 수 있습니다.</p>
            <p>선택 항목인 이메일을 입력하지 않아도 문의를 남길 수 있지만 개별 답변은 받을 수 없습니다. 필수 항목의 수집에 동의하지 않으면 문의 접수가 제한됩니다.</p>
          </PrivacyPolicySection>

          <PrivacyPolicySection title="6. 브라우저 저장 정보">
            <p>최근 출발지와 검색 성능 개선용 캐시는 이용자의 브라우저 로컬 저장소에 저장됩니다. 문의 제출 시 현재 선택된 출발지가 첨부되는 경우를 제외하면 이 정보는 자동 전송되지 않습니다.</p>
            <p>문의 연속 전송 방지를 위해 마지막 전송 시각을 브라우저에 저장하며, 1분 전송 제한 판단에만 사용합니다.</p>
          </PrivacyPolicySection>

          <PrivacyPolicySection title="7. 개인정보 관련 문의">
            <p><strong>담당:</strong> 만나역 운영자</p>
            <p>
              <strong>이메일:</strong>{' '}
              <a href="mailto:1rkdwlgns1@gmail.com" className="font-bold text-[#5A45E8] underline underline-offset-2">
                1rkdwlgns1@gmail.com
              </a>
            </p>
          </PrivacyPolicySection>

          <PrivacyPolicySection title="8. 처리방침 변경">
            <p>내용이 변경되는 경우 시행 전에 서비스 화면을 통해 안내합니다.</p>
          </PrivacyPolicySection>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-xl bg-[#5A45E8] text-sm font-black text-white transition hover:bg-[#4D39D4]"
        >
          확인했어요
        </button>
      </section>
    </div>
  )
}

function PrivacyPolicySection({ title, children }) {
  return (
    <section className="py-4">
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      <div className="mt-2 space-y-1.5 break-keep text-xs leading-5 text-slate-600">{children}</div>
    </section>
  )
}

function UsageGuideDialog({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-slate-950/35 px-4 pb-4 pt-4 backdrop-blur-[2px] md:pt-10"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="w-full max-w-md rounded-2xl border border-white/60 bg-white p-5 shadow-2xl md:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usage-guide-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-[#5A45E8]">만나역 이용안내</p>
            <h2 id="usage-guide-title" className="mt-1 text-xl font-black tracking-tight text-slate-950">
              추천 결과는 이렇게 계산해요
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="이용안내 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
          <GuideItem title="위치 균형" description="각 출발지에서 한쪽으로 치우치지 않는 역을 살펴봐요." />
          <GuideItem title="주변 상권" description="역 반경 600m 안의 카페, 식당, 문화시설을 기준으로 비교해요." />
          <GuideItem title="노선 접근성" description="이용 가능한 노선과 환승 편의성을 함께 반영해요." />
        </div>

        <p className="mt-4 break-keep text-xs leading-5 text-slate-500">
          실제 이동 시간과 영업 정보는 달라질 수 있으니, 최종 약속 전 지도와 길찾기를 확인해주세요.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-xl bg-[#5A45E8] text-sm font-black text-white transition hover:bg-[#4D39D4]"
        >
          확인했어요
        </button>
      </section>
    </div>
  )
}

function GuideItem({ title, description }) {
  return (
    <div className="py-3">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mt-1 break-keep text-xs leading-5 text-slate-500">{description}</p>
    </div>
  )
}

function Icon({ name, className = 'h-5 w-5', alt = '', style }) {
  if (name === 'trophy') {
    return <TrophyIcon className={className} aria-hidden={alt ? undefined : true} style={style} />
  }

  return <img src={ICONS[name]} alt={alt} aria-hidden={alt ? undefined : true} className={className} style={style} />
}

function TrophyIcon({ className = 'h-5 w-5', style }) {
  return (
    <svg viewBox="0 0 256 256" className={className} style={style} fill="currentColor" focusable="false">
      <path d="M232 64h-24V48a8 8 0 0 0-8-8H56a8 8 0 0 0-8 8v16H24A16 16 0 0 0 8 80v16a40 40 0 0 0 40 40h3.65A80.13 80.13 0 0 0 120 191.61V216H96a8 8 0 0 0 0 16h64a8 8 0 0 0 0-16h-24v-24.42c31.94-3.23 58.44-25.64 68.08-55.58H208a40 40 0 0 0 40-40V80a16 16 0 0 0-16-16ZM48 120a24 24 0 0 1-24-24V80h24v32q0 4 .39 8ZM232 96a24 24 0 0 1-24 24h-.5a81.81 81.81 0 0 0 .5-8.9V80h24Z" />
    </svg>
  )
}

function getPlaceTabLabel(category) {
  if (category === 'restaurant') return '식당'
  if (category === 'activity') return '놀거리'

  return PLACE_CATEGORY_LABELS[category]
}

function MannayeokLogo() {
  return (
    <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#5A45E8] shadow-sm ring-1 ring-violet-200">
      <span className="absolute h-4 w-4 rounded-full bg-white/95" />
      <span className="absolute left-1.5 h-2 w-2 rounded-full bg-[#5A45E8]" />
      <span className="absolute right-1.5 h-2 w-2 rounded-full bg-[#00A84D] ring-1 ring-white" />
      <span className="absolute h-px w-5 bg-violet-100" />
    </span>
  )
}

function HeroFeatureGrid() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <HeroFeatureCard
        icon="subway"
        tone="blue"
        title="위치 균형"
        description="지도상 중간 위치에 가까운 역 참고"
      />
      <HeroFeatureCard
        icon="store"
        tone="green"
        title="주변 상권"
        description="카페, 맛집, 놀거리가 많은 역 추천"
      />
      <HeroFeatureCard
        icon="arrowRight"
        tone="purple"
        title="노선 접근성"
        description="환승 부담이 적은 노선 기준으로 추천"
      />
    </div>
  )
}

function HeroFeatureCard({ icon, tone = 'blue', title, description }) {
  const toneMap = {
    blue: ICON_TONES.blue,
    green: ICON_TONES.green,
    purple: ICON_TONES.purple,
  }
  const iconTone = toneMap[tone] || ICON_TONES.blue

  return (
    <div className="rounded-xl border border-white/80 bg-white/86 p-3 text-center shadow-[0_8px_20px_rgba(15,23,42,0.06)] backdrop-blur sm:rounded-2xl sm:p-4">
      <span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${iconTone.bg} sm:h-11 sm:w-11`}>
        <Icon name={icon} className="h-4 w-4 sm:h-5 sm:w-5" style={{ filter: iconTone.filter }} />
      </span>
      <h2 className="mt-2 text-xs font-black text-slate-950 sm:mt-3 sm:text-sm">{title}</h2>
      <p className="mx-auto mt-1 hidden max-w-32 text-[11px] font-bold leading-5 text-slate-500 sm:block">
        {description}
      </p>
    </div>
  )
}

function StationLineChips({ station, className = '' }) {
  const lines = getStationLineLabels(station)

  if (!lines.length) return null

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {lines.map((line) => (
        <span
          key={line}
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${getLineChipClass(line)}`}
        >
          {line}
        </span>
      ))}
    </div>
  )
}

function BetaBadge({ className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-xl border border-violet-200 bg-white/95 px-2.5 py-1 text-[11px] font-black tracking-wide text-[#5A45E8] shadow-sm ring-1 ring-violet-50 ${className}`}
      aria-label="베타 서비스"
    >
      BETA
    </span>
  )
}

function ResultTypeCard({
  station,
  selected = false,
  onClick,
  primary = false,
}) {
  if (!station) return null

  const Component = onClick ? 'button' : 'div'
  const scores = getStationDisplayScores(station)
  const reasons = getRecommendationReasons(station, scores, primary)

  if (primary) {
    return (
      <Component
        type={onClick ? 'button' : undefined}
        onClick={onClick}
          className={`flex w-full flex-col rounded-2xl border border-violet-100 bg-white px-4 pb-2.5 pt-4 text-left shadow-[0_14px_36px_rgba(90,69,232,0.10)] transition active:scale-[0.99] md:p-4 ${
          selected ? 'ring-2 ring-violet-100' : ''
        } ${onClick ? 'cursor-pointer hover:border-violet-200' : ''}`}
      >
        <div className="flex items-start justify-between gap-3 pr-24 sm:pr-28">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5A45E8] px-3 py-1.5 text-xs font-black text-white shadow-sm">
                <Icon name="trophy" className="h-3.5 w-3.5" style={{ filter: 'brightness(0) invert(1)' }} />
                최적 추천역
              </span>
              <StationLineChips station={station} />
            </div>

            <h2 className="mt-3 break-keep text-[28px] font-black tracking-tight text-slate-950 md:text-3xl">
              {station.name}
            </h2>
          </div>

        </div>

          <div className="mt-3 rounded-xl bg-slate-50/80 px-3 py-2.5">
            <p className="text-[11px] font-black text-slate-400">추천 이유</p>
            <ul className="mt-1.5 space-y-1">
              {reasons.map((reason) => (
                <li key={reason} className="flex gap-1.5 text-xs font-bold leading-5 text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5A45E8]" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 grid grid-cols-3 border-t border-slate-100 pb-0.5 pt-2.5 md:pb-0 md:pt-3">
            <MetricSummaryItem label="접근 조건" value={getMetricStatus(scores.fairness)} />
            <MetricSummaryItem label="주변 상권" value={getCommercialMetricStatus(station)} />
            <MetricSummaryItem label="노선 접근성" value={getMetricStatus(scores.transit)} />
        </div>
      </Component>
    )
  }

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
        className={`flex w-full flex-col rounded-2xl border border-slate-100 bg-white/90 p-4 text-left shadow-sm transition active:scale-[0.99] md:p-4 ${
        selected ? 'ring-2 ring-violet-100' : ''
      } ${onClick ? 'cursor-pointer hover:border-violet-200' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center rounded-full border border-violet-100 bg-[#F6F3FF] px-3 py-1.5 text-xs font-black text-[#5A45E8]">
          위치상 가장 중간인 역
        </span>
      </div>

      <h2 className="mt-3 break-keep text-2xl font-black tracking-tight text-slate-950 md:text-[28px]">
        {station.name}
      </h2>
      <p className="mt-2 max-w-sm break-keep text-xs leading-5 text-slate-500 md:text-[13px] md:leading-5">
        출발지 위치를 기준으로 가장 중간에 가까운 역이에요.
      </p>

      <div className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
        <FairMetricRow label="위치 균형" value={getMetricStatus(scores.fairness)} />
        <FairMetricRow label="주변 상권" value={getCommercialMetricStatus(station)} />
        <FairMetricRow label="노선 접근성" value={getMetricStatus(scores.transit)} />
      </div>

      <div className="mt-3 rounded-xl bg-[#F6F3FF] px-3 py-2 text-[11px] font-bold leading-5 text-[#8A7BD8] md:text-xs">
        지도상 중간 위치를 중요하게 본다면 {station.name}을 참고해보세요.
      </div>
    </Component>
  )
}

function MobileFairStationCard({ station, collapsed, onToggle }) {
  if (!station) return null

  const scores = getStationDisplayScores(station)

  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-left shadow-sm lg:hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={!collapsed}
      >
        <span className="min-w-0">
          <span className="block text-xs font-black text-[#5A45E8]">위치상 가장 중간인 역</span>
          <span className="mt-0.5 block truncate text-base font-black tracking-tight text-slate-950">
            {station.name}
          </span>
        </span>
        <span className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-500">
          {collapsed ? '펼치기' : '접기'}
        </span>
      </button>

      {!collapsed ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="break-keep text-xs leading-5 text-slate-500">
            출발지 위치를 기준으로 가장 중간에 가까운 역이에요.
          </p>

          <div className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
            <FairMetricRow label="위치 균형" value={getMetricStatus(scores.fairness)} />
            <FairMetricRow label="주변 상권" value={getCommercialMetricStatus(station)} />
            <FairMetricRow label="노선 접근성" value={getMetricStatus(scores.transit)} />
          </div>

          <div className="mt-3 rounded-xl bg-[#F6F3FF] px-3 py-2 text-[11px] font-bold leading-5 text-[#8A7BD8]">
            지도상 중간 위치를 중요하게 본다면 {station.name}을 참고해보세요.
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MetricSummaryItem({ label, value }) {
  return (
    <div className="min-w-0 border-r border-slate-100 px-1.5 text-center last:border-r-0 sm:px-3">
      <p className="truncate text-[11px] font-bold text-slate-400 sm:text-xs">
        {label}
      </p>
      <p className={`mt-1 text-sm font-black sm:text-base ${getMetricStatusTextClass(value)}`}>
        {value}
      </p>
    </div>
  )
}

function FairMetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="truncate text-xs font-bold text-slate-400">
        {label}
      </span>
      <span className={`shrink-0 text-[13px] font-black ${getMetricStatusTextClass(value)}`}>
        {value}
      </span>
    </div>
  )
}

function StationCard({ station, selected, onClick }) {
  const scores = getStationDisplayScores(station)

  return (
    <button
      type="button"
      onClick={onClick}
        className={`w-full min-w-0 rounded-2xl border p-3 text-left shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition active:scale-[0.98] md:p-3.5 ${
          selected
            ? 'border-violet-200 bg-violet-50/35 ring-1 ring-violet-100'
            : 'border-slate-100 bg-white/95 hover:border-violet-200 hover:bg-white'
        }`}
    >
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0">
            <div className="min-w-0">
              <strong className="block min-w-0 break-keep text-[15px] font-black tracking-tight text-slate-950 sm:text-lg">{station.name}</strong>
            </div>
            <StationLineChips station={station} className="mt-2" />
          </div>
        </div>
  
        <p className="mt-2 text-[13px] leading-5 text-slate-500 sm:text-xs">
        중간점에서 {formatDistance(station.distanceFromCenter)} · 상권 약 {station.hotPlaceCount}곳
      </p>

      <div className="mt-2.5 grid grid-cols-3 gap-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/40">
        <MiniMetric label="위치 균형" value={getMetricStatus(scores.fairness)} />
        <MiniMetric label="주변 상권" value={getCommercialMetricStatus(station)} />
        <MiniMetric label="노선 접근" value={getMetricStatus(scores.transit)} />
      </div>
    </button>
  )
}

function MiniMetric({ label, value }) {
  return (
    <div className="min-w-0 border-r border-slate-100 bg-white/50 px-1.5 py-2 text-center last:border-r-0">
      <p className="truncate text-xs font-bold text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 text-[13px] font-black sm:mt-1 sm:text-sm ${getMetricStatusTextClass(value)}`}>
        {value}
      </p>
    </div>
  )
}

function getMetricStatusTextClass(value) {
  if (value === '매우 좋음') return 'text-[#6D4AFF]'
  if (value === '매우 풍부') return 'text-[#6D4AFF]'
  if (value === '좋음') return 'text-[#947EFF]'
  if (value === '풍부') return 'text-[#947EFF]'
  if (value === '보통') return 'text-[#64748B]'
  if (value === '충분') return 'text-[#8A7BD8]'
  if (value === '아쉬움') return 'text-[#EF4444]'
  if (value === '적음') return 'text-[#EF4444]'

  return 'text-[#64748B]'
}

function getMetricStatus(score) {
  if (score >= 85) return '매우 좋음'
  if (score >= 70) return '좋음'
  if (score >= 50) return '보통'
  return '아쉬움'
}

function getCommercialMetricStatus(station) {
  const count = station.hotPlaceCount || 0
  const signal = station.hotPlaceSignal || 0

  if (count >= 1100 || signal >= 1450) return '매우 풍부'
  if (count >= 750 || signal >= 980) return '풍부'
  if (count >= 450 || signal >= 590) return '충분'
  if (count >= 180 || signal >= 240) return '보통'
  return '적음'
}

function getRecommendationReasons(station, scores, primary = false) {
  const reasons = []
  const lines = getStationLineLabels(station)
  const linesText = lines.slice(0, 2).join(' · ')
  const hotPlaceCount = station.hotPlaceCount || 0
  const hotPlaceSignal = station.hotPlaceSignal || 0

  if (scores.fairness >= 80) {
    reasons.push('출발지 간 이동 부담이 비교적 비슷해요.')
  } else if (scores.fairness >= 55) {
    reasons.push('위치 균형은 무난하고, 상권과 접근성이 보완돼요.')
  } else if (primary || scores.commercial >= 70 || scores.transit >= 70) {
    reasons.push('완전한 중간보다 실제로 만나기 좋은 조건을 우선했어요.')
  }

  if (hotPlaceCount >= 1100 || hotPlaceSignal >= 1450) {
    reasons.push('식사, 카페, 편의시설 선택지가 넉넉해 약속 장소로 좋아요.')
  } else if (hotPlaceCount >= 750 || hotPlaceSignal >= 980) {
    reasons.push('주변 상권이 풍부해서 약속 장소를 고르기 좋아요.')
  } else if (hotPlaceCount >= 450 || hotPlaceSignal >= 590) {
    reasons.push('식사와 카페 선택지가 충분해서 약속 장소를 정하기 무난해요.')
  } else if (hotPlaceCount >= 180 || hotPlaceSignal >= 240) {
    reasons.push('기본적인 식사와 카페 선택지는 있는 편이에요.')
  }

  if (scores.transit >= 85 && linesText) {
    reasons.push(`${linesText} 이용이 편리해 접근성이 좋아요.`)
  } else if (scores.transit >= 65 && linesText) {
    reasons.push(`${linesText}을 이용할 수 있어 이동이 무난해요.`)
  } else if (scores.transit >= 65) {
    reasons.push('주요 노선을 이용할 수 있어 이동이 무난해요.')
  }

  if (!reasons.length) {
    reasons.push(primary ? '위치, 상권, 노선 조건을 종합했을 때 가장 적합한 후보예요.' : '지도상 중간 위치를 비교할 때 참고하기 좋아요.')
  }

  return reasons.slice(0, 3)
}

function getStationDisplayScores(station) {
  return {
    commercial: Math.round(getStationCommercialScore(station)),
    fairness: Math.round(getDistanceBalanceDisplayScore(station)),
    transit: Math.round(getTransitAccessDisplayScore(station)),
  }
}

function getStationLineLabels(station) {
  if (!station?.name) return []

  return getStationLines(station.name).slice(0, 3)
}

function getLineChipClass(line) {
  if (line.includes('1호선')) return 'border-blue-200 bg-blue-50 text-[#3658F5]'
  if (line.includes('2호선') || line.includes('7호선')) return 'border-emerald-200 bg-emerald-50 text-[#4DA463]'
  if (line.includes('3호선') || line.includes('분당')) return 'border-amber-200 bg-amber-50 text-amber-600'
  if (line.includes('4호선')) return 'border-sky-200 bg-sky-50 text-sky-600'
  if (line.includes('5호선') || line.includes('6호선')) return 'border-violet-200 bg-violet-50 text-[#8A4FF5]'
  if (line.includes('9호선')) return 'border-yellow-200 bg-yellow-50 text-yellow-700'

  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function getDistanceBalanceDisplayScore(station) {
  const score = Number.isFinite(station.fairnessScore)
    ? station.fairnessScore
    : getNumericScore(station.middleHubScore, 0)

  if (score <= 0) return 12
  return Math.round(10 + score * 0.9)
}

function getTransitAccessDisplayScore(station) {
  const hubScore = getNumericScore(station.middleHubScore, 0)
  const compatibilityScore = Number.isFinite(station.transitCompatibilityScore)
    ? station.transitCompatibilityScore
    : 0
  const lineEaseScore = 20 + ((Math.max(-24, Math.min(compatibilityScore, 20)) + 24) / 44) * 66

  return Math.max(20, Math.min(96, Math.round(lineEaseScore * 0.65 + hubScore * 0.35)))
}

function getStationCommercialScore(station) {
  if (!station) return 0

  return getCommercialDisplayScore(station.hotPlaceCount || 0)
}

function getCommercialDisplayScore(hotPlaceCount) {
  if (hotPlaceCount <= 0) return 0

  return Math.round(Math.min(100, 20 + Math.sqrt(Math.min(hotPlaceCount, 220) / 220) * 70))
}

function getNumericScore(value, fallback) {
  return Number.isFinite(value) ? value : fallback
}

function getStationMapKey(station) {
  return station.name.replace(/\s+/g, '').trim()
}

function isSameOrigin(a, b) {
  if (!a || !b) return false

  if (a.id && b.id) return a.id === b.id
  return `${a.lat},${a.lng}` === `${b.lat},${b.lng}`
}

function hasSameOrigins(origins) {
  return origins.some((origin, index) => origins.slice(index + 1).some((nextOrigin) => isSameOrigin(origin, nextOrigin)))
}

function getMaximumOriginDistance(origins) {
  let maximumDistance = 0

  origins.forEach((origin, index) => {
    origins.slice(index + 1).forEach((nextOrigin) => {
      maximumDistance = Math.max(maximumDistance, calculateDistanceInMeters(origin, nextOrigin))
    })
  })

  return maximumDistance
}

function createResultShareUrl({
  origins,
  recommendedStations,
  fairStations,
  selectedStationId,
}) {
  const shareUrl = new URL(PUBLIC_APP_URL)
  const sharedRecommendedStations = recommendedStations.slice(0, 4).map(pickSharedStation)
  const sharedFairStations = fairStations.slice(0, 1).map(pickSharedStation)
  const payload = {
    origins: origins.map(pickSharedOrigin),
    recommendedStations: sharedRecommendedStations,
    fairStations: sharedFairStations,
    selectedStationId,
  }

  shareUrl.searchParams.set('result', encodeSharePayload(payload))
  return shareUrl.toString()
}

function readSharedResult() {
  try {
    const encodedPayload = new URLSearchParams(window.location.search).get('result')
    if (!encodedPayload) return null

    const payload = decodeSharePayload(encodedPayload)
    const hasValidOrigins = Array.isArray(payload.origins) && payload.origins.length >= MIN_ORIGIN_COUNT
    const hasValidStations =
      Array.isArray(payload.recommendedStations) && payload.recommendedStations.length > 0

    return hasValidOrigins && hasValidStations ? payload : null
  } catch {
    return null
  }
}

function pickSharedOrigin(origin) {
  return {
    id: origin.id,
    address: origin.address,
    routeName: origin.routeName,
    lat: origin.lat,
    lng: origin.lng,
  }
}

function pickSharedStation(station) {
  return {
    id: station.id,
    name: station.name,
    lat: station.lat,
    lng: station.lng,
    distanceFromCenter: station.distanceFromCenter,
    hotPlaceCount: station.hotPlaceCount,
    middleHubScore: station.middleHubScore,
    fairnessScore: station.fairnessScore,
    transitCompatibilityScore: station.transitCompatibilityScore,
  }
}

function encodeSharePayload(payload) {
  const recommendedSelectionIndex = payload.recommendedStations.findIndex(
    (station) => station.id === payload.selectedStationId,
  )
  const fairSelectionIndex = payload.fairStations.findIndex(
    (station) => station.id === payload.selectedStationId,
  )
  const selection =
    recommendedSelectionIndex >= 0
      ? [0, recommendedSelectionIndex]
      : fairSelectionIndex >= 0
        ? [1, fairSelectionIndex]
        : [0, 0]
  const compactPayload = [
    4,
    payload.origins.map(packSharedOriginV3),
    payload.recommendedStations.map(packSharedStationV4),
    payload.fairStations.map(packSharedStationV4),
    selection,
  ]
  const compressedBytes = gzipSync(strToU8(JSON.stringify(compactPayload)), { level: 9 })
  const binary = Array.from(compressedBytes, (byte) => String.fromCharCode(byte)).join('')

  return `z${window.btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}`
}

function decodeSharePayload(encodedPayload) {
  const isCompressed = encodedPayload.startsWith('z')
  const payloadBase64 = isCompressed ? encodedPayload.slice(1) : encodedPayload
  const base64 = payloadBase64.replaceAll('-', '+').replaceAll('_', '/')
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = window.atob(paddedBase64)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  const json = isCompressed ? strFromU8(gunzipSync(bytes)) : new TextDecoder().decode(bytes)
  const payload = JSON.parse(json)

  if (!Array.isArray(payload)) return payload

  if (payload[0] === 4) {
    const recommendedStations = (payload[2] || []).map((station, index) =>
      unpackSharedStationV4(station, `shared-recommended-${index}`),
    )
    const fairStations = (payload[3] || []).map((station, index) =>
      unpackSharedStationV4(station, `shared-fair-${index}`),
    )
    const [selectionGroup = 0, selectionIndex = 0] = payload[4] || []
    const selectedStation =
      (selectionGroup === 1 ? fairStations : recommendedStations)[selectionIndex] ||
      recommendedStations[0]

    return {
      origins: (payload[1] || []).map(unpackSharedOriginV3),
      recommendedStations,
      fairStations,
      selectedStationId: selectedStation?.id || null,
    }
  }

  if (payload[0] === 3) {
    const recommendedStations = (payload[2] || []).map((station, index) =>
      unpackSharedStationV3(station, `shared-recommended-${index}`),
    )
    const fairStations = (payload[3] || []).map((station, index) =>
      unpackSharedStationV3(station, `shared-fair-${index}`),
    )
    const [selectionGroup = 0, selectionIndex = 0] = payload[4] || []
    const selectedStation =
      (selectionGroup === 1 ? fairStations : recommendedStations)[selectionIndex] ||
      recommendedStations[0]

    return {
      origins: (payload[1] || []).map(unpackSharedOriginV3),
      recommendedStations,
      fairStations,
      selectedStationId: selectedStation?.id || null,
    }
  }

  if (payload[0] !== 2) return payload

  return {
    origins: (payload[1] || []).map(unpackSharedOrigin),
    recommendedStations: (payload[2] || []).map(unpackSharedStation),
    fairStations: (payload[3] || []).map(unpackSharedStation),
    selectedStationId: payload[4],
  }
}

function packSharedOriginV3(origin) {
  return [
    origin.routeName || origin.address,
    roundShareNumber(origin.lat, 6),
    roundShareNumber(origin.lng, 6),
  ]
}

function unpackSharedOriginV3(origin, index) {
  return {
    id: `shared-origin-${index}`,
    address: origin[0],
    routeName: origin[0],
    lat: origin[1],
    lng: origin[2],
  }
}

function packSharedStationV4(station) {
  return [
    station.name,
    roundShareNumber(station.lat, 6),
    roundShareNumber(station.lng, 6),
    roundShareNumber(station.distanceFromCenter),
    roundShareNumber(station.hotPlaceCount),
    roundShareNumber(station.middleHubScore),
    roundShareNumber(station.fairnessScore),
    roundShareNumber(station.transitCompatibilityScore),
  ]
}

function unpackSharedStationV4(station, id) {
  return {
    id,
    name: station[0],
    lat: station[1],
    lng: station[2],
    distanceFromCenter: station[3],
    hotPlaceCount: station[4],
    middleHubScore: station[5],
    fairnessScore: station[6],
    transitCompatibilityScore: station[7],
  }
}

function unpackSharedStationV3(station, id) {
  return {
    id,
    name: station[0],
    lat: station[1],
    lng: station[2],
    distanceFromCenter: station[3],
    hotPlaceCount: station[4],
    hotPlaceSignal: station[5],
    meetingPlaceScore: station[6],
    middleHubScore: station[7],
    fairnessScore: station[8],
    transitCompatibilityScore: station[9],
  }
}

function unpackSharedOrigin(origin) {
  return {
    id: origin[0],
    address: origin[1],
    routeName: origin[2],
    lat: origin[3],
    lng: origin[4],
  }
}

function unpackSharedStation(station) {
  return {
    id: station[0],
    name: station[1],
    lat: station[2],
    lng: station[3],
    distanceFromCenter: station[4],
    hotPlaceCount: station[5],
    hotPlaceSignal: station[6],
    meetingPlaceScore: station[7],
    middleHubScore: station[8],
    fairnessScore: station[9],
    transitCompatibilityScore: station[10],
  }
}

function roundShareNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return value ?? null

  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

function getLastInquirySubmittedAt() {
  try {
    return Number(window.localStorage.getItem('mannayeok:last-inquiry-at')) || 0
  } catch {
    return 0
  }
}

function setLastInquirySubmittedAt(timestamp) {
  try {
    window.localStorage.setItem('mannayeok:last-inquiry-at', String(timestamp))
  } catch {
    // The inquiry was still sent even if private browsing blocks local storage.
  }
}

async function searchPlacesWithCategory(station, category) {
  const places = await searchNearbyPlaces(station, category)

  return places.map((place) => ({
    ...place,
    categoryLabel: PLACE_CATEGORY_LABELS[category],
  }))
}

async function searchAllNearbyPlaces(station) {
  const nearbyPlaces = await Promise.all(
    PLACE_CATEGORY_KEYS.map((category) =>
      searchPlacesWithCategory(station, category),
    ),
  )

  const uniquePlaces = new Map()

  nearbyPlaces.flat().forEach((place) => {
    if (!uniquePlaces.has(place.id)) {
      uniquePlaces.set(place.id, place)
    }
  })

  return [...uniquePlaces.values()].sort((a, b) => a.distance - b.distance).slice(0, 5)
}

function formatDistance(distance) {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)}km`
  }

  return `${distance}m`
}

export default App
