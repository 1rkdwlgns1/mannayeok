import { useEffect, useMemo, useRef, useState } from 'react'
import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate'
import AddressInput from './components/AddressInput'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Send,
  Share2,
  X,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import KakaoMap from './components/KakaoMap'
import { clearAuth, getStoredMember } from './services/authStorage'
import {
  createKakaoDirectionUrl,
  createNaverSearchUrl,
} from './utils/mapDirectionUrls'
import OnboardingScreen from './components/OnboardingScreen'
import PlaceCategoryIcon from './components/PlaceCategoryIcon'
import PlaceList from './components/PlaceList'
import backgroundImage from './assets/background.png'
import logoImage from './assets/rogo.png'
import { getStationLines } from './data/subwayStationLines'
import { getStationDisplayTransitTimeProfile } from './data/subwayTravelTimeGraph'
import {
  enrichOriginsWithNearbyStations,
  findPracticalReferenceAreas,
  getRegionNameByCoordinates,
  isBlockedOrigin,
  searchNearbyPlaces,
  searchRecommendedStations,
} from './services/kakaoApi'
import { loadKakaoShareSdk, shareResultToKakao } from './services/kakaoShare'
import { calculateDistanceInMeters, calculateMidpoint } from './services/midpointCalculator'
import { fetchTransitRouteWithRetry } from './services/transitApi'

const PUBLIC_APP_URL = 'https://mannayeok.kr/'
const ONBOARDING_COMPLETED_KEY = 'mannayeok_onboarding_completed'

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
  const [initialLegalDialog] = useState(() => window.location.hash)
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
  const [publicTimeBalanceProfile, setPublicTimeBalanceProfile] = useState({
    requestKey: '',
    scores: {},
  })
  const [fairStations, setFairStations] = useState(() => sharedResult?.fairStations || [])
  const [referenceMidpoint, setReferenceMidpoint] = useState(
    () => sharedResult?.referenceMidpoint || null,
  )
  const [referenceMidpointVisible, setReferenceMidpointVisible] = useState(
    () => Boolean(sharedResult?.referenceMidpoint),
  )
  const [selectedReferenceAreaId, setSelectedReferenceAreaId] = useState(
    () => sharedResult?.selectedReferenceAreaId || null,
  )
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
  const [alternativeStationIndex, setAlternativeStationIndex] = useState(0)
  const [fairStationCollapsed, setFairStationCollapsed] = useState(true)
  const [hasStarted, setHasStarted] = useState(
    () => Boolean(
      sharedResult
      || getStoredMember()
      || window.sessionStorage.getItem(ONBOARDING_COMPLETED_KEY)
      || ['#terms', '#privacy'].includes(window.location.hash)
    ),
  )
  const [isOnboardingLeaving, setIsOnboardingLeaving] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentMember, setCurrentMember] = useState(getStoredMember)
  const [guideOpen, setGuideOpen] = useState(false)
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(() => initialLegalDialog === '#privacy')
  const [serviceInfoOpen, setServiceInfoOpen] = useState(() => initialLegalDialog === '#terms')
  const [dataSourcesOpen, setDataSourcesOpen] = useState(false)
  const [resultShareOpen, setResultShareOpen] = useState(false)
  const [kakaoShareStatus, setKakaoShareStatus] = useState('idle')
  const [kakaoShareAttempt, setKakaoShareAttempt] = useState(0)
  const [kakaoShareError, setKakaoShareError] = useState('')
  const [shareNotice, setShareNotice] = useState('')
  const [originInputResetKey, setOriginInputResetKey] = useState(0)
  const onboardingExitTimerRef = useRef(null)
  const dialogOpen =
    guideOpen ||
    inquiryOpen ||
    privacyOpen ||
    serviceInfoOpen ||
    dataSourcesOpen ||
    resultShareOpen

  const selectableStations = useMemo(
    () => [...recommendedStations, ...fairStations],
    [recommendedStations, fairStations],
  )
  const selectedStation =
    selectableStations.find((station) => station.id === selectedStationId) || recommendedStations[0] || null
  const fairStation = fairStations[0] || null
  const referenceAreas = referenceMidpoint?.practicalAreas || []
  const selectedReferenceArea =
    referenceAreas.find((area) => area.id === selectedReferenceAreaId) ||
    referenceAreas[0] ||
    null

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
  const visibleAlternativeIndex = alternativeStations.length
    ? Math.min(alternativeStationIndex, alternativeStations.length - 1)
    : 0
  const visibleAlternativeStation = alternativeStations[visibleAlternativeIndex] || null
  const timeBalanceStations = useMemo(() => {
    const primary = recommendedStations[0] || null
    const alternatives = recommendedStations
      .slice(1)
      .filter((station) => station.hotPlaceCount >= MIN_RECOMMENDATION_HOT_PLACE_COUNT)
      .slice(0, 3)

    return [primary, ...alternatives].filter(Boolean)
  }, [recommendedStations])
  const timeBalanceRequestKey = useMemo(
    () =>
      [
        ...origins.map(
          (origin) =>
            origin.nearbyStationName ||
            origin.routeName ||
            origin.address ||
            `${origin.lat},${origin.lng}`,
        ),
        ...timeBalanceStations.map((station) => station.name),
      ].join('|'),
    [origins, timeBalanceStations],
  )

  useEffect(() => {
    if (!origins.length || !timeBalanceStations.length) return undefined

    let active = true

    timeBalanceStations.forEach(async (station) => {
        const stationProfile = getStationDisplayTransitTimeProfile(origins, station.name)
        const profileItems = stationProfile?.items || []

        if (profileItems.length < 2) {
          if (!active) return
          setPublicTimeBalanceProfile((currentProfile) => ({
            requestKey: timeBalanceRequestKey,
            scores: {
              ...(currentProfile.requestKey === timeBalanceRequestKey
                ? currentProfile.scores
                : {}),
              [getStationTimeBalanceKey(station)]: null,
            },
          }))
          return
        }

        const results = await Promise.allSettled(
          profileItems.map((item) =>
            isSameTransitStation(item.originName, station.name)
              ? Promise.resolve({ minutes: 0 })
              : fetchTransitRouteWithRetry(item.originName, station.name),
          ),
        )
        const minutes = results
          .map((result) => (result.status === 'fulfilled' ? result.value.minutes : null))
          .filter(Number.isFinite)
        const score =
          minutes.length === profileItems.length
            ? getPublicTransitTimeBalanceScore(minutes)
            : null

      if (!active) return

      setPublicTimeBalanceProfile((currentProfile) => ({
        requestKey: timeBalanceRequestKey,
        scores: {
          ...(currentProfile.requestKey === timeBalanceRequestKey
            ? currentProfile.scores
            : {}),
          [getStationTimeBalanceKey(station)]: score,
        },
      }))
    })

    return () => {
      active = false
    }
  }, [origins, timeBalanceRequestKey, timeBalanceStations])

  const getTimeBalanceStatus = (station) => {
    if (!station || publicTimeBalanceProfile.requestKey !== timeBalanceRequestKey) {
      return '조회 중'
    }

    const stationKey = getStationTimeBalanceKey(station)
    if (!Object.hasOwn(publicTimeBalanceProfile.scores, stationKey)) {
      return '조회 중'
    }

    const score = publicTimeBalanceProfile.scores[stationKey]
    return Number.isFinite(score) ? getMetricStatus(score) : '확인 불가'
  }

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
    if (!loading) return undefined

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
  }, [
    dataSourcesOpen,
    guideOpen,
    inquiryOpen,
    privacyOpen,
    resultShareOpen,
    serviceInfoOpen,
  ])

  useEffect(() => {
    if (!dialogOpen) return undefined

    const scrollY = window.scrollY
    const bodyStyle = document.body.style
    const htmlStyle = document.documentElement.style
    const previousBodyStyles = {
      overflow: bodyStyle.overflow,
      position: bodyStyle.position,
      top: bodyStyle.top,
      width: bodyStyle.width,
    }
    const previousHtmlStyles = {
      overflow: htmlStyle.overflow,
      overscrollBehavior: htmlStyle.overscrollBehavior,
      scrollBehavior: htmlStyle.scrollBehavior,
    }

    bodyStyle.overflow = 'hidden'
    bodyStyle.position = 'fixed'
    bodyStyle.top = `-${scrollY}px`
    bodyStyle.width = '100%'
    htmlStyle.overflow = 'hidden'
    htmlStyle.overscrollBehavior = 'none'
    htmlStyle.scrollBehavior = 'auto'

    return () => {
      Object.assign(bodyStyle, previousBodyStyles)
      htmlStyle.overflow = previousHtmlStyles.overflow
      htmlStyle.overscrollBehavior = previousHtmlStyles.overscrollBehavior
      htmlStyle.scrollBehavior = 'auto'
      window.scrollTo(0, scrollY)
      htmlStyle.scrollBehavior = previousHtmlStyles.scrollBehavior
    }
  }, [dialogOpen])

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
    if (isBlockedOrigin(suggestion)) {
      setError('제주도·울릉도·독도는 현재 출발지 검색을 지원하지 않아요.')
      return
    }

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
    setOriginInputResetKey((key) => key + 1)
    clearSearchResults()
    setPlaceError('')
  }

  const clearSearchResults = () => {
    setOrigins([])
    setRecommendedStations([])
    setFairStations([])
    setReferenceMidpoint(null)
    setReferenceMidpointVisible(false)
    setSelectedReferenceAreaId(null)
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

    if (selectedOrigins.some(isBlockedOrigin)) {
      setError('제주도·울릉도·독도는 현재 출발지로 사용할 수 없어요.')
      return
    }

    setLoadingDots('.')
    setLoading(true)
    setError('')
    setPlaceError('')
    setReferenceMidpoint(null)
    setReferenceMidpointVisible(false)
    setSelectedReferenceAreaId(null)

    try {
      const enrichedOrigins = await enrichOriginsWithNearbyStations(selectedOrigins)
      const hasUnsupportedOrigin = enrichedOrigins.some(
        (origin) => origin.hasSupportedTransitAccess === false,
      )

      if (hasUnsupportedOrigin) {
        const center = calculateMidpoint(enrichedOrigins)
        const [regionName, practicalAreas] = await Promise.all([
          getRegionNameByCoordinates(center).catch(() => '중간지점 주변'),
          findPracticalReferenceAreas(center).catch(() => []),
        ])

        setOrigins(enrichedOrigins)
        setRecommendedStations([])
        setFairStations([])
        setSelectedStationId(null)
        setPlaces([])
        setSelectedPlaceCategory(null)
        setReferenceMidpoint({
          id: 'reference-midpoint',
          name: '지도상 중간지점',
          mapLabel: '중간',
          regionName,
          practicalAreas,
          ...center,
        })
        setSelectedReferenceAreaId(practicalAreas[0]?.id || null)
        return
      }

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
      setReferenceMidpoint(null)
      setReferenceMidpointVisible(false)
      setSelectedReferenceAreaId(null)
      setSelectedStationId(stations[0].id)
      setPlaces([])
      setSelectedPlaceCategory(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '추천 중간역 계산 중 문제가 발생했습니다.')
      setOrigins([])
      setRecommendedStations([])
      setFairStations([])
      setReferenceMidpoint(null)
      setReferenceMidpointVisible(false)
      setSelectedReferenceAreaId(null)
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

    window.sessionStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
    setIsOnboardingLeaving(true)
    onboardingExitTimerRef.current = window.setTimeout(() => {
      setHasStarted(true)
    }, 560)
  }

  const getResultShareData = () => {
    const referencePoint = selectedReferenceArea || referenceMidpoint

    if (!primaryStation && !referencePoint) return

    const shareUrl = primaryStation
      ? createResultShareUrl({
          origins,
          recommendedStations,
          fairStations,
          selectedStationId,
        })
      : createReferenceShareUrl({
          origins,
          referenceMidpoint,
          selectedReferenceAreaId: selectedReferenceArea?.id || null,
        })
    const originNames = origins.map((origin) => origin.routeName || origin.address).join(' · ')

    if (!primaryStation) {
      const regionLabel = `${referencePoint.regionName} 일대`
      return {
        title: `만나역 참고 지역 - ${regionLabel}`,
        text: `${originNames}의 중간지점 근처 참고 지역은 ${regionLabel}예요.`,
        url: shareUrl,
        resultName: regionLabel,
        shareDescription: `${originNames}의 중간지점 근처에서 찾은 참고 지역을 확인해보세요.`,
      }
    }

    return {
      title: `만나역 추천 결과 - ${primaryStation.name}`,
      text: `${originNames}에서 만나기 좋은 역은 ${primaryStation.name}이에요.`,
      url: shareUrl,
      resultName: primaryStation.name,
      shareDescription: `${originNames}에서 만난다면? 만나기 좋은 약속역을 확인해보세요.`,
    }
  }

  const handleResultShare = () => {
    if (!primaryStation && !referenceMidpoint) return
    setKakaoShareStatus('loading')
    setKakaoShareError('')
    setResultShareOpen(true)
  }

  const handleResultKakaoShare = () => {
    const shareData = getResultShareData()
    if (!shareData) return

    if (kakaoShareStatus !== 'ready') {
      if (kakaoShareStatus === 'error') {
        setKakaoShareStatus('loading')
        setKakaoShareError('')
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
        stationName: shareData.resultName,
        originNames: origins.map((origin) => origin.routeName || origin.address).join(' · '),
        url: shareData.url,
        title: shareData.title,
        description: shareData.shareDescription,
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

  const handleOpenLogin = () => {
    window.sessionStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
    setMobileMenuOpen(false)
    window.location.assign('/login')
  }

  const handleAuthAction = () => {
    if (currentMember) {
      clearAuth()
      setCurrentMember(null)
      setMobileMenuOpen(false)
      return
    }
    handleOpenLogin()
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
              <button
                type="button"
                onClick={handleAuthAction}
                className="ml-1 inline-flex h-10 items-center rounded-xl border border-[#DCD5FF] bg-white px-3.5 text-sm font-black text-[#5A45E8] shadow-sm transition hover:border-[#BFB3FF] hover:bg-violet-50 active:scale-[0.98]"
              >
                {currentMember
                  ? `${currentMember.nickname ? `${currentMember.nickname}님 · ` : ''}로그아웃`
                  : '로그인'}
              </button>
            </nav>

            <div className="relative mt-2.5 flex shrink-0 items-center gap-1 md:hidden">
              <button
                type="button"
                onClick={handleAuthAction}
                className="inline-flex h-10 items-center rounded-xl border border-[#DCD5FF] bg-white px-3 text-xs font-black text-[#5A45E8] shadow-sm transition active:scale-[0.98]"
              >
                {currentMember ? '로그아웃' : '로그인'}
              </button>
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
              key={originInputResetKey}
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
              className="mt-3 w-full rounded-2xl bg-[#5A45E8] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#4938D1] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-violet-200 sm:mt-3.5 sm:py-4 sm:text-base"
            >
              {loading ? `추천 후보를 찾는 중${loadingDots}` : '만나기 좋은 역 찾기'}
            </button>

            <p className="mt-2 text-center text-[11px] font-bold text-slate-400 md:text-xs">
              [현재 서비스는 수도권 전철망 이용 지역을 지원합니다.]
            </p>

          </section>

          {referenceMidpoint ? (
            <section className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:p-4">
              <div
                className="rounded-xl border border-red-100 bg-gradient-to-r from-red-50 to-orange-50/60 px-3 py-3 md:px-4 md:py-3.5"
                role="note"
              >
                <div className="flex items-start gap-2.5 md:gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-red-400 shadow-sm ring-1 ring-red-100">
                    <MapPin className="h-4 w-4" strokeWidth={2.3} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-black text-red-500 md:text-sm">
                      일부 출발지가 현재 서비스 지역을 벗어났어요.
                    </p>
                    <p className="mt-1 break-keep text-xs font-semibold leading-5 text-slate-600 md:text-[13px]">
                      약속역 추천은 수도권 전철망 이용 지역에서 제공하고 있어요. 대신 교통편과
                      상권을 반영하지 않은 참고용 지도상 중간지점은 확인할 수 있어요.
                    </p>
                    <button
                      type="button"
                      onClick={() => setReferenceMidpointVisible((visible) => !visible)}
                      className="mt-2.5 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-black text-red-500 shadow-sm transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-100"
                      aria-expanded={referenceMidpointVisible}
                    >
                      <MapPin className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
                      {referenceMidpointVisible ? '중간지점 닫기' : '중간지점 보기'}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : error ? (
            <section className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:p-4">
              <p
                className="whitespace-pre-line rounded-xl bg-red-50 px-3 py-2 text-sm leading-6 text-red-500 md:px-4 md:py-3"
                role="alert"
              >
                {error}
              </p>
            </section>
          ) : null}
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
                className={`relative grid items-start gap-3 lg:items-stretch ${
                  fairStation ? 'lg:grid-cols-[1.08fr_0.92fr]' : 'lg:grid-cols-1'
                } ${helpTooltipActive ? 'z-[120]' : 'z-40'}`}
              >
                <div className="relative h-full">
                  <ResultTypeCard
                    station={primaryStation}
                    selected={primaryStation.id === selectedStation.id}
                    onClick={() => handleStationSelect(primaryStation.id)}
                    primary
                    timeBalanceStatus={getTimeBalanceStatus(primaryStation)}
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
                      selected={fairStation.id === selectedStation.id}
                      onSelect={() => handleStationSelect(fairStation.id)}
                      onToggle={() => setFairStationCollapsed((collapsed) => !collapsed)}
                    />
                    <div className="hidden h-full lg:block">
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

            {selectedStation ? (
              <TransitTimeEstimateCard origins={origins} station={selectedStation} />
            ) : null}

            {alternativeStations.length ? (
              <section className="rounded-2xl border border-slate-100 bg-white/92 p-3.5 shadow-sm backdrop-blur md:p-4">
                <div className="mb-3 flex items-center justify-between gap-3 md:mb-4">
                  <div>
                    <h2 className="text-base font-black text-slate-950">
                      다른 추천 후보 TOP3
                    </h2>
                    <p className="mt-1 hidden text-xs leading-5 text-slate-500 md:block">
                      탭하면 지도와 길찾기 기준역이 바뀌어요. 각 역의 특성을 비교해보세요.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 md:hidden">
                    <span className="mr-0.5 text-[11px] font-black tabular-nums text-slate-400">
                      {visibleAlternativeIndex + 1} / {alternativeStations.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAlternativeStationIndex(
                          (index) => Math.max(0, index - 1),
                        )
                      }
                      disabled={visibleAlternativeIndex === 0}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm active:bg-violet-50 active:text-[#5A45E8] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none"
                      aria-label="이전 추천 후보"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAlternativeStationIndex(
                          (index) => Math.min(alternativeStations.length - 1, index + 1),
                        )
                      }
                      disabled={visibleAlternativeIndex === alternativeStations.length - 1}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm active:bg-violet-50 active:text-[#5A45E8] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none"
                      aria-label="다음 추천 후보"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {visibleAlternativeStation ? (
                  <div className="md:hidden">
                    <StationCard
                      station={{
                        ...visibleAlternativeStation,
                        rank: visibleAlternativeIndex + 2,
                      }}
                      selected={visibleAlternativeStation.id === selectedStation.id}
                      onClick={() => handleStationSelect(visibleAlternativeStation.id)}
                      timeBalanceStatus={getTimeBalanceStatus(visibleAlternativeStation)}
                    />
                  </div>
                ) : null}
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
                      timeBalanceStatus={getTimeBalanceStatus(station)}
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

            <section id="places" className="rounded-2xl border border-slate-100 bg-white/95 px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur md:px-5 md:py-5">
              <div className="space-y-3.5">
                <div>
                  <p className="text-sm font-black text-[#5A45E8]">
                    {selectedStation.name} 근처 약속 장소
                  </p>
                  <h2 className="mt-1 break-keep text-base font-black tracking-tight text-slate-950">
                    어디에서 만날까요?
                  </h2>
                  <p className="mt-1.5 hidden max-w-sm text-xs font-medium leading-5 text-slate-500 md:block md:text-sm md:leading-5">
                    카페, 식당, 술집, 놀거리 중 원하는 카테고리를 선택해보세요.
                  </p>
                </div>

                <div className="grid w-full grid-cols-4 border-y border-slate-100 md:ml-3 md:inline-flex md:w-auto md:gap-9 md:pr-3">
                  {PLACE_CATEGORY_KEYS.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handlePlaceRecommendation(category)}
                      disabled={placeLoading}
                      className={`relative inline-flex shrink-0 items-center justify-center gap-1.5 py-3 text-[15px] font-black leading-none transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60 ${
                        selectedPlaceCategory === category
                          ? 'text-[#5A45E8] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-[#5A45E8] after:transition-all after:duration-200'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <PlaceCategoryIcon category={category} className="h-4 w-4" />
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
                placeCategory={selectedPlaceCategory}
                placeCategoryLabel={PLACE_CATEGORY_LABELS[selectedPlaceCategory]}
              />
            ) : null}
          </>
        ) : referenceMidpoint && referenceMidpointVisible ? (
          <ReferenceMidpointResult
            origins={origins}
            midpoint={referenceMidpoint}
            practicalAreas={referenceAreas}
            selectedArea={selectedReferenceArea}
            onSelectArea={setSelectedReferenceAreaId}
            onShare={handleResultShare}
          />
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
              stationName={
                primaryStation?.name ||
                `${(selectedReferenceArea || referenceMidpoint)?.regionName || ''} 일대`
              }
              originNames={origins.map((origin) => origin.routeName || origin.address)}
              resultLabel={primaryStation ? '만나역 추천' : '중간지점 근처 참고 지역'}
              resultBadge={primaryStation ? '최적 추천역' : '참고용'}
              description={
                primaryStation
                  ? '친구가 같은 추천 결과를 바로 확인할 수 있어요.'
                  : '친구가 같은 참고 지역과 중간지점을 바로 확인할 수 있어요.'
              }
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

function ReferenceMidpointResult({
  origins,
  midpoint,
  practicalAreas,
  selectedArea,
  onSelectArea,
  onShare,
}) {
  const [mapOpen, setMapOpen] = useState(false)
  const practicalArea = selectedArea || null
  const displayPoint = practicalArea ? { ...practicalArea, mapLabel: '참고' } : midpoint
  const mapPoints = practicalArea ? [displayPoint, midpoint] : [midpoint]
  const alternativeAreas = practicalAreas.filter((area) => area.id !== practicalArea?.id).slice(0, 3)

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_14px_36px_rgba(90,69,232,0.08)]">
        <div className="relative p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 pr-24 sm:pr-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5A45E8] px-3 py-1.5 text-xs font-black text-white shadow-sm">
                <MapPin className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
                {practicalArea ? '중간지점 근처 참고 지역' : '참고용 중간지점'}
              </span>
              <h2 className="mt-3 break-keep text-[26px] font-black tracking-tight text-slate-950 md:text-3xl">
                {displayPoint.regionName} 일대
              </h2>
              {practicalArea ? (
                <p className="mt-1 text-xs font-bold text-[#5A45E8] md:text-sm">
                  {practicalArea.name} 주변
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onShare}
              className="absolute right-4 top-4 inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 text-xs font-black text-[#5A45E8] shadow-sm transition hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-100 sm:static"
            >
              <Share2 className="h-3.5 w-3.5" strokeWidth={2.3} aria-hidden="true" />
              결과 공유
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 border-t border-slate-100 pt-3">
            <ReferenceMetric
              label="계산 기준"
              value={practicalArea ? '중간점 인근' : '좌표 중앙'}
            />
            <ReferenceMetric
              label="교통 거점"
              value={practicalArea?.kind || '확인 안 됨'}
              muted={!practicalArea}
            />
            <ReferenceMetric
              label="주변 상권"
              value="반영 안 함"
              muted
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {origins.map((origin, index) => (
              <span
                key={origin.id || `${origin.lat}-${origin.lng}`}
                className="max-w-full truncate rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-100 md:text-xs"
              >
                출발지 {String.fromCharCode(65 + index)} · {origin.routeName || origin.address}
              </span>
            ))}
          </div>
        </div>

        <p className="border-t border-amber-100 bg-amber-50 px-4 py-2.5 text-[11px] font-bold leading-5 text-amber-700 md:px-5 md:text-xs">
          대중교통 이동시간은 반영하지 않은 참고용 지역이에요. 실제 약속을 정할 때는 각자의
          이동 경로를 별도로 확인해주세요.
        </p>
      </section>

      {alternativeAreas.length ? (
        <section className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm md:px-5">
          <div>
            <h3 className="text-sm font-black text-slate-950 md:text-base">
              다른 참고 지역 TOP{alternativeAreas.length}
            </h3>
            <p className="mt-1 text-[11px] font-medium leading-5 text-slate-500 md:text-xs">
              선택하면 카드와 지도의 기준 지역이 바뀌어요.
            </p>
          </div>
          <div className="mt-3 grid gap-2.5 md:grid-cols-3">
            {alternativeAreas.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => onSelectArea(area.id)}
                className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-keep text-sm font-black text-slate-950">
                      {area.regionName} 일대
                    </p>
                    <p className="mt-1 truncate text-[11px] font-bold text-[#5A45E8]">
                      {area.name} 주변
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-violet-50 px-2 py-1 text-[10px] font-black text-[#5A45E8]">
                    {area.kind}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-medium text-slate-500">
                  좌표 중간점에서 {formatDistance(area.distanceFromCenter)}
                </p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm md:px-5 md:py-4">
        <div className={`${mapOpen ? 'mb-3' : ''} flex items-center justify-between gap-3`}>
          <div>
            <p className="text-sm font-black text-slate-950">지도에서 위치보기</p>
            <p className="mt-0.5 hidden text-xs text-slate-500 md:block">
              {practicalArea
                ? '정확한 좌표 중간점과 현실적인 참고 지역을 함께 확인해보세요.'
                : '출발지와 참고용 중간지점을 함께 확인해보세요.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMapOpen((open) => !open)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-[#5A45E8]"
            aria-expanded={mapOpen}
          >
            {mapOpen ? '지도 접기' : '지도 열기'}
          </button>
        </div>
        {mapOpen ? (
          <KakaoMap
            origins={origins}
            meetingPoint={displayPoint}
            meetingPoints={mapPoints}
            referenceOnly
          />
        ) : null}
      </section>
    </div>
  )
}

function ReferenceMetric({ label, value, muted = false }) {
  return (
    <div className="min-w-0 border-r border-slate-100 px-1 text-center last:border-r-0">
      <span className="block text-[10px] font-black text-slate-400 md:text-[11px]">{label}</span>
      <strong
        className={`mt-1 block break-keep text-xs font-black md:text-sm ${
          muted ? 'text-slate-500' : 'text-[#5A45E8]'
        }`}
      >
        {value}
      </strong>
    </div>
  )
}

function TransitTimeEstimateCard({ origins, station }) {
  const [openRouteOriginIndex, setOpenRouteOriginIndex] = useState(null)
  const [selectedMobileOriginIndex, setSelectedMobileOriginIndex] = useState(0)
  const [publicTransitProfile, setPublicTransitProfile] = useState(null)
  const profile = useMemo(
    () => getStationDisplayTransitTimeProfile(origins, station?.name),
    [origins, station],
  )
  const requestKey = useMemo(
    () =>
      [
        station?.name,
        ...(profile?.items || []).map((item) => item.originName),
      ].join('|'),
    [profile, station?.name],
  )
  const estimatedItems = (
    publicTransitProfile?.requestKey === requestKey
      ? publicTransitProfile.items
      : profile?.items
  )?.filter((item) => Number.isFinite(item.minutes)) || []
  const isTransitLoading = Boolean(
    station?.name &&
      profile?.items?.length &&
      publicTransitProfile?.requestKey !== requestKey,
  )

  useEffect(() => {
    if (!station?.name || !profile?.items?.length) return undefined

    let active = true

    Promise.allSettled(
      profile.items.map((item) =>
        isSameTransitStation(item.originName, station.name)
          ? Promise.resolve({
              minutes: 0,
              transfers: 0,
              routeSteps: [],
              source: 'SAME_STATION',
              fallbackSchedule: false,
            })
          : fetchTransitRouteWithRetry(item.originName, station.name),
      ),
    ).then((results) => {
      if (!active) return

      const items = profile.items.map((fallbackItem, index) => {
        const result = results[index]
        if (result.status !== 'fulfilled') return fallbackItem

        const publicRoute = result.value
        return {
          ...fallbackItem,
          minutes: publicRoute.minutes,
          transfers: publicRoute.transfers,
          path: publicRoute.routeSteps.map((step) => step.station),
          routeSteps: publicRoute.routeSteps,
          source: publicRoute.source,
          fallbackSchedule: publicRoute.fallbackSchedule,
        }
      })

      setPublicTransitProfile({ requestKey, items })
    })

    return () => {
      active = false
    }
  }, [profile, requestKey, station?.name])

  if (isTransitLoading) {
    return (
      <section className="rounded-2xl border border-violet-100 bg-white px-3 py-5 shadow-[0_8px_24px_rgba(90,69,232,0.06)] md:px-4">
        <p className="flex items-center justify-center gap-2 text-sm font-black text-slate-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
          <span>
            실시간 조회 중<AnimatedLoadingDots />
          </span>
        </p>
      </section>
    )
  }

  if (!estimatedItems.length) return null

  const mobileItem =
    estimatedItems.find((item) => item.originIndex === selectedMobileOriginIndex) ||
    estimatedItems[0]

  return (
    <section className="rounded-2xl border border-violet-100 bg-white px-3 py-3 shadow-[0_8px_24px_rgba(90,69,232,0.06)] md:px-4">
      <p className="mb-2 flex items-center gap-1.5 pl-0.5 text-[10px] font-bold text-slate-500 md:text-[11px]">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {estimatedItems.some((item) => item.fallbackSchedule)
          ? '심야 대체 조회: 다음 운행일 13시 시간표 기준'
          : estimatedItems.every((item) => item.source === 'SEOUL_METRO_PUBLIC_DATA')
            ? '최신 시간표 기준'
            : '일부 경로 자체 예상시간 기준'}
      </p>

      <div className="md:hidden">
        <div
          className="mb-2 grid overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 p-1"
          style={{ gridTemplateColumns: `repeat(${estimatedItems.length}, minmax(0, 1fr))` }}
          role="tablist"
          aria-label="출발지별 최소시간 경로"
        >
          {estimatedItems.map((item) => {
            const selected = item.originIndex === mobileItem.originIndex
            return (
              <button
                key={`mobile-transit-tab-${item.originIndex}`}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setSelectedMobileOriginIndex(item.originIndex)
                  setOpenRouteOriginIndex(null)
                }}
                className={`min-w-0 rounded-lg px-1.5 py-2 text-[11px] font-black transition ${
                  selected
                    ? `bg-white shadow-sm ${getTransitOriginColorClass(item.originIndex)}`
                    : 'text-slate-400'
                }`}
              >
                출발지 {String.fromCharCode(65 + item.originIndex)}
              </button>
            )
          })}
        </div>

        <TransitOriginCard
          item={mobileItem}
          origin={origins[mobileItem.originIndex]}
          station={station}
          routeOpen={openRouteOriginIndex === mobileItem.originIndex}
          onToggleRoute={() =>
            setOpenRouteOriginIndex((index) =>
              index === mobileItem.originIndex ? null : mobileItem.originIndex,
            )
          }
          showMobileRoute
        />
      </div>

      <div className={`hidden min-w-0 items-start gap-1.5 md:grid ${getTransitSummaryGridClass(estimatedItems.length)}`}>
        {estimatedItems.map((item) => (
          <TransitOriginCard
            key={`${item.originIndex}-${item.originName}`}
            item={item}
            origin={origins[item.originIndex]}
            station={station}
            routeOpen={openRouteOriginIndex === item.originIndex}
            onToggleRoute={() =>
              setOpenRouteOriginIndex((index) =>
                index === item.originIndex ? null : item.originIndex,
              )
            }
          />
        ))}
      </div>

      <p className="mt-2.5 text-center text-[10px] font-bold text-[#7C6BE8] md:text-[11px]">
        [출발지 카드를 누르면 카카오맵·네이버지도 경로 버튼이 열려요]
      </p>
    </section>
  )
}

function AnimatedLoadingDots() {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setDots((currentDots) => (currentDots.length >= 3 ? '.' : `${currentDots}.`))
    }, 450)

    return () => window.clearInterval(intervalId)
  }, [])

  return <span aria-hidden="true">{dots}</span>
}

function TransitOriginCard({
  item,
  origin,
  station,
  routeOpen,
  onToggleRoute,
  showMobileRoute = false,
}) {
  const originName = item.originName || origin?.nearbyStationName || origin?.routeName
  const originColorClass = getTransitOriginColorClass(item.originIndex)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggleRoute}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onToggleRoute()
      }}
      aria-expanded={routeOpen}
      className={`min-w-0 cursor-pointer rounded-xl bg-white px-3 py-3 ring-1 transition active:scale-[0.995] ${
        routeOpen
          ? 'ring-violet-200 shadow-[0_6px_18px_rgba(90,69,232,0.08)]'
          : 'ring-slate-100 hover:ring-violet-200'
      }`}
    >
      {showMobileRoute ? (
        <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-black leading-5 text-slate-800">
              {originName} → {station.name}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="flex items-baseline justify-end gap-1">
              <span className="text-[11px] font-bold text-slate-400">
                {item.source === 'SEOUL_METRO_PUBLIC_DATA' ? '최소시간' : '예상시간'}
              </span>
              <strong className="text-[15px] font-black leading-5 text-blue-600">
                {formatTransitMinutes(item)}
              </strong>
            </span>
            <span className="mt-0.5 block text-[11px] font-bold leading-4 text-slate-500">
              환승{' '}
              <strong className={`font-black ${getTransferCountColorClass(item.transfers || 0)}`}>
                {item.transfers || 0}
              </strong>
              회
            </span>
          </span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2">
            <span className="min-w-0">
              <span className={`block text-[11px] font-black md:text-xs ${originColorClass}`}>
                출발지 {String.fromCharCode(65 + item.originIndex)}
              </span>
              <span className="mt-1 hidden whitespace-nowrap text-[11px] font-black text-slate-800 md:block md:text-sm">
                {originName} → {station.name}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[9px] font-bold leading-3 text-slate-400 md:text-[10px]">
                {item.source === 'SEOUL_METRO_PUBLIC_DATA'
                  ? '최소시간 경로'
                  : '예상 이동시간'}
              </span>
              <span className="mt-0.5 block text-[13px] font-black text-blue-600 md:text-sm">
                {formatTransitMinutes(item)}
              </span>
            </span>
          </div>

          <div className="-mb-2 mt-3 flex min-w-0 items-start gap-2 border-t border-[#ECECF3] pt-5">
            <TransitRoutePreview routeSteps={item.routeSteps} />
            <span className="shrink-0 text-right text-[11px] font-black text-slate-600 md:text-xs">
              환승{' '}
              <span className={getTransferCountColorClass(item.transfers || 0)}>
                {item.transfers || 0}
              </span>
              회
            </span>
          </div>
        </>
      )}

      {showMobileRoute ? (
        <div className="-mx-1.5 -mb-2 mt-3 border-t border-[#ECECF3] pt-5">
          <TransitRoutePreview routeSteps={item.routeSteps} showMobile />
        </div>
      ) : null}

      {routeOpen ? (
        <div
          className="mt-3 grid grid-cols-2 gap-2 border-t border-[#ECECF3] pt-3"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <a
            href={createKakaoDirectionUrl(origin, station)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[#FEE500] bg-[#FEE500] px-2 py-2 text-center text-xs font-black text-[#191919] shadow-sm transition hover:bg-[#F6DD00] active:scale-[0.98] md:text-sm"
          >
            카카오맵
          </a>
          <a
            href={createNaverSearchUrl(origin, station)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[#03C75A] bg-[#03C75A] px-2 py-2 text-center text-xs font-black text-white shadow-sm transition hover:bg-[#02B351] active:scale-[0.98] md:text-sm"
          >
            네이버지도
          </a>
        </div>
      ) : null}
    </div>
  )
}

function getTransitOriginColorClass(originIndex) {
  if (originIndex === 1) return 'text-[#00A84D]'
  if (originIndex === 2) return 'text-yellow-600'
  if (originIndex === 3) return 'text-rose-600'
  return 'text-[#5A45E8]'
}

function TransitRoutePreview({ routeSteps, showMobile = false }) {
  const previewSteps = getTransitRoutePreviewSteps(routeSteps)

  if (previewSteps.length < 2) return null

  return (
    <div className={`${showMobile ? 'block' : 'hidden'} min-w-0 flex-1 md:block`}>
      <div className="relative h-9 min-w-0">
        <span
          className="absolute top-[5px] h-px bg-slate-300"
          style={{
            left: `${getTransitRouteEdgeInset(previewSteps.length)}%`,
            right: `${getTransitRouteEdgeInset(previewSteps.length)}%`,
          }}
          aria-hidden="true"
        />
        {previewSteps.map((step, index) => (
          <div
            key={`${step.station}-${step.line}-${index}`}
            className="absolute top-0 z-10 min-w-0 -translate-x-1/2 text-center"
            style={{
              left: `${getTransitRouteStepPosition(index, previewSteps.length)}%`,
              width: `${Math.min(32, 120 / previewSteps.length)}%`,
            }}
          >
            <div className="min-w-0">
              <span
                className={`relative mx-auto block h-2.5 w-2.5 rounded-full ${
                  step.transfer
                    ? ''
                    : 'border-2 bg-white'
                }`}
                style={
                  step.transfer
                    ? {
                        background: `linear-gradient(90deg, ${getTransitRouteColor(previewSteps[index - 1]?.line)} 0 50%, ${getTransitRouteColor(step.line)} 50% 100%)`,
                      }
                    : { borderColor: getTransitRouteColor(step.line) }
                }
              >
                {step.transfer ? (
                  <span className="absolute inset-[2px] rounded-full bg-white" />
                ) : null}
              </span>
              <span className="mt-1 block truncate text-[9px] font-bold text-slate-600 md:text-[10px]">
                {step.station}
              </span>
            </div>
          </div>
        ))}
        {previewSteps.slice(0, -1).map((step, index) =>
          step.line ? (
            <span
              key={`${step.station}-${step.line}-segment-${index}`}
              className="contents"
            >
              <span
                className="absolute top-[5px] z-[5] h-[2px] -translate-y-1/2"
                style={{
                  left: `${getTransitRouteStepPosition(index, previewSteps.length)}%`,
                  width: `${
                    getTransitRouteStepPosition(index + 1, previewSteps.length) -
                    getTransitRouteStepPosition(index, previewSteps.length)
                  }%`,
                  backgroundColor: getTransitRouteColor(step.line),
                }}
                aria-hidden="true"
              />
              <span
                className="absolute top-[5px] z-20 inline-flex max-w-[4.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full border px-1.5 py-px text-[8px] font-black leading-3"
                style={{
                  left: `${
                    (
                      getTransitRouteStepPosition(index, previewSteps.length) +
                      getTransitRouteStepPosition(index + 1, previewSteps.length)
                    ) / 2
                  }%`,
                  ...getLineChipStyle(step.line),
                }}
              >
                <span className="truncate">{step.line}</span>
              </span>
            </span>
          ) : null,
        )}
      </div>
    </div>
  )
}

function getTransitRouteEdgeInset(stepCount) {
  if (stepCount <= 2) return 8
  if (stepCount === 3) return 7
  return 6
}

function getTransitRouteStepPosition(index, stepCount) {
  if (stepCount <= 1) return 50

  const inset = getTransitRouteEdgeInset(stepCount)
  return inset + (index * (100 - inset * 2)) / (stepCount - 1)
}

function getTransitRoutePreviewSteps(routeSteps) {
  if (!Array.isArray(routeSteps) || routeSteps.length < 2) return []

  const first = routeSteps[0]
  const last = routeSteps[routeSteps.length - 1]
  const transferSteps = routeSteps.filter((step) => step.transfer)
  const steps = [first, ...transferSteps, last]

  return steps.filter(
    (step, index) =>
      index === 0 ||
      step.station !== steps[index - 1].station ||
      step.line !== steps[index - 1].line,
  )
}

function getTransitRouteColor(line = '') {
  return getSubwayLineTheme(line).color
}

function getTransitSummaryGridClass(itemCount) {
  if (itemCount >= 4) return 'md:grid-cols-2'
  if (itemCount === 3) return 'md:grid-cols-3'
  return 'md:grid-cols-2'
}

function getTransferCountColorClass(transfers) {
  if (transfers >= 3) return 'text-red-500'
  if (transfers === 2) return 'text-orange-500'
  if (transfers === 1) return 'text-emerald-600'
  return 'text-[#5A45E8]'
}

function formatTransitMinutes(item) {
  if (item.source === 'SEOUL_METRO_PUBLIC_DATA') {
    return `약 ${Math.round(item.minutes)}분`
  }

  const minutes = item.minutes
  if (minutes <= 1) return '이동 없음'

  const roundedMinutes = Math.max(5, Math.round(minutes / 5) * 5)
  const lowerMinutes = Math.max(5, roundedMinutes - 5)
  const upperMinutes = roundedMinutes + 5

  return `약 ${lowerMinutes}~${upperMinutes}분`
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
  resultLabel = '만나역 추천',
  resultBadge = '최적 추천역',
  description = '친구가 같은 추천 결과를 바로 확인할 수 있어요.',
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
            <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
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
              <p className="text-[11px] font-bold text-slate-400">{resultLabel}</p>
              <p className="mt-0.5 text-2xl font-black text-slate-950">{stationName}</p>
            </div>
            <span className="rounded-lg bg-[#5A45E8] px-2.5 py-1.5 text-xs font-black text-white">
              {resultBadge}
            </span>
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
      className="fixed inset-0 z-[150] flex items-start justify-center overflow-hidden overscroll-none bg-slate-950/35 px-3 py-2 backdrop-blur-[2px] md:px-4 md:pb-4 md:pt-10"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && status.phase !== 'sending') onClose()
      }}
    >
      <section
        className="max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-white/60 bg-white p-3 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:max-h-none md:overflow-y-visible md:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-dialog-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-[#5A45E8]">개발자에게 문의하기</p>
            <h2 id="inquiry-dialog-title" className="mt-1.5 text-lg font-black tracking-tight text-slate-950 md:mt-1 md:text-xl">
              만나역을 더 좋게 만들어주세요
            </h2>
            <p className="mt-0.5 break-keep text-[11px] leading-4 text-slate-500 md:mt-1 md:text-xs md:leading-5">
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
          <form className="mt-2 md:mt-4" onSubmit={handleSubmit}>
            <fieldset>
              <legend className="text-xs font-black text-slate-800 md:text-sm">문의 유형</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 md:mt-2 md:gap-2">
                {INQUIRY_TYPES.map((inquiryType) => (
                  <label
                    key={inquiryType}
                    className={`flex min-h-8 cursor-pointer items-center justify-center rounded-lg border px-1 py-1 text-center text-[11px] font-bold leading-4 transition md:min-h-10 md:px-2 md:py-2 md:text-xs ${
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

            <label className="mt-2 block text-xs font-black text-slate-800 md:mt-4 md:text-sm" htmlFor="inquiry-message">
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
              className="mt-1.5 h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-xs placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 md:mt-2 md:h-auto md:resize-y md:px-3.5 md:py-3 md:leading-6 md:placeholder:text-sm"
            />
            <p className="mt-1 text-right text-[11px] font-medium text-slate-400">{message.length}/250</p>

            <label className="mt-2 block text-xs font-black text-slate-800 md:mt-3 md:text-sm" htmlFor="inquiry-email">
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
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-800 outline-none transition placeholder:text-xs placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 md:mt-2 md:h-11 md:px-3.5 md:placeholder:text-sm"
            />

            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="inquiry-website">웹사이트</label>
              <input id="inquiry-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <p className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-[11px] font-bold leading-5 text-[#7868C8] md:mt-4">
              현재 출발지와 추천 결과가 문의에 자동으로 첨부돼요.
            </p>

            <div className="mt-3">
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
              <div className="ml-6 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-4 text-slate-500 md:gap-y-1">
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
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#5A45E8] text-sm font-black text-white transition hover:bg-[#4D39D4] disabled:cursor-not-allowed disabled:bg-slate-300 md:sticky md:bottom-0 md:mt-4 md:h-11 md:shadow-[0_-8px_18px_rgba(255,255,255,0.96)]"
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
      className="fixed inset-0 z-[170] flex items-start justify-center overflow-hidden overscroll-none bg-slate-950/45 px-4 pb-4 pt-4 backdrop-blur-[2px] md:pt-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-white/60 bg-white p-5 shadow-2xl md:max-h-[calc(100dvh-3rem)] md:p-7"
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
        <p>이동시간과 환승 경로는 서울교통공사 시간표 기반 최소시간 경로이며, 실시간 지연이나 임시 운행 변경에 따라 실제와 다를 수 있습니다.</p>
        <p>장소 정보는 외부 데이터 갱신 시점과 실제 영업 상황에 따라 달라질 수 있습니다.</p>
        <p>중요한 약속 전에는 연결된 지도와 해당 교통 운영기관의 최신 정보를 함께 확인해주세요.</p>
      </PrivacyPolicySection>
      <PrivacyPolicySection title="3. 지원 지역">
        <p>현재 베타 서비스는 수도권 전철망 이용 지역을 기준으로 추천합니다.</p>
        <p>선택한 출발지 주변에서 지원되는 전철역을 찾지 못하면 추천이 제한되며, 지원 지역은 차차 확대할 예정입니다.</p>
      </PrivacyPolicySection>
      <PrivacyPolicySection title="4. 서비스 변경 및 문의">
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
            <li>
              <a
                href="https://www.data.go.kr/data/15143842/openapi.do"
                target="_blank"
                rel="noreferrer"
                className={linkClass}
              >
                서울교통공사 최단경로이동정보 API
              </a>
              : 시간표 기반 최소시간 경로, 이동시간, 환승 횟수 및 환승역 정보
            </li>
          </ul>
          <p>공공데이터는 출처표시 조건에 따라 가공·활용되며, 원 제공기관의 최신 자료와 차이가 있을 수 있습니다.</p>
        </PrivacyPolicySection>
        <PrivacyPolicySection title="외부 API">
          <ul className="list-disc space-y-2 pl-5">
            <li>카카오맵·카카오 Local API: 주소 검색, 역 좌표, 지도 및 주변 장소 정보</li>
            <li>카카오 Mobility API: 지도에 표시되는 도로 이동 경로 정보</li>
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
      className="fixed inset-0 z-[170] flex items-start justify-center overflow-hidden overscroll-none bg-slate-950/45 px-4 pb-4 pt-4 backdrop-blur-[2px] md:pt-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-white/60 bg-white p-5 shadow-2xl md:max-h-[calc(100dvh-3rem)] md:p-7"
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
            <p>이동시간과 경로 조회를 위해 사용자가 선택한 출발역과 추천역의 역명을 만나역 백엔드를 통해 서울교통공사 최단경로이동정보 API에 전송합니다. GPS, 현재 위치 좌표, 주소 및 이용자를 식별할 수 있는 정보는 전송하지 않습니다.</p>
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
            <p>최근 출발지와 검색 성능 개선용 캐시는 이용자의 브라우저 로컬 저장소에 저장됩니다. 문의 제출 시에는 현재 선택된 출발지가 첨부될 수 있습니다.</p>
            <p>지하철 경로 조회 결과는 중복 호출을 줄이기 위해 브라우저 메모리에서 최대 5분간 임시 보관되며, 브라우저를 닫으면 유지되지 않습니다.</p>
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
      className="fixed inset-0 z-[150] flex items-start justify-center overflow-hidden overscroll-none bg-slate-950/35 px-4 pb-4 pt-4 backdrop-blur-[2px] md:pt-10"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-white/60 bg-white p-5 shadow-2xl md:max-h-[calc(100dvh-3.5rem)] md:p-6"
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

        <section className="mt-5">
          <h3 className="text-xs font-black text-[#5A45E8]">선정 과정</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <GuideProcessStep
              number="1"
              title="후보역을 넓게 찾아요"
              description="출발지들의 중간 부근, 서로 오가는 경로 주변, 사람들이 만나기 편한 주요 역을 후보로 모아요."
            />
            <GuideProcessStep
              number="2"
              title="이동 부담을 비교해요"
              description="각 출발지에서 후보역까지의 거리와 예상 이동 부담을 비교해 한 사람에게 지나치게 치우친 역을 걸러요."
            />
            <GuideProcessStep
              number="3"
              title="만나기 좋은 조건을 더해요"
              description="카페·식당·문화시설 등 주변 선택지와 약속 장소로서의 활용도, 철도 노선 연결성을 함께 살펴봐요."
            />
            <GuideProcessStep
              number="4"
              title="목적에 따라 순위를 나눠요"
              description="실제로 만나기 좋은 종합 순위와 위치의 공평함을 더 중시한 순위를 따로 계산해 결과에 보여줘요."
            />
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-base font-black text-slate-900">결과마다 의미가 달라요</h3>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            <GuideResultType
              title="최적 추천역"
              description="위치 균형과 이동 부담뿐 아니라 상권, 약속 장소 적합성, 노선 연결성까지 종합했을 때 가장 실용적인 역이에요."
            />
            <GuideResultType
              title="위치상 가장 중간인 역"
              description="주변 상권보다 출발지 사이의 거리 차이와 지도상 중간 위치를 더 중요하게 본 참고 결과예요."
            />
            <GuideResultType
              title="다른 추천 후보 TOP3"
              description="최적 추천역 다음으로 종합 조건이 좋은 역들이에요. 원하는 분위기나 동선에 맞춰 비교해서 선택할 수 있어요."
            />
          </div>
        </section>

        <div className="mt-5">
          <p className="text-xs font-black text-[#5A45E8]">결과표 읽는 법</p>
          <h3 className="mt-1 text-base font-black text-slate-900">세부 등급은 이렇게 비교해요</h3>
        </div>
        <div className="mt-5 space-y-3">
          <GuideItem
            title="이동시간 균형"
            unit="100점 기준"
            description="최신 시간표에서 확인한 출발지별 소요시간의 차이가 작을수록 높아요. 최적 추천역과 TOP3를 같은 기준으로 비교해요."
          >
            <GuideGradeScale type="score" />
          </GuideItem>
          <GuideItem
            title="거리 균형"
            unit="100점 기준"
            description="출발지에서 후보역까지의 지도상 거리 차이가 작을수록 높아요. 위치상 가장 중간인 역을 살펴볼 때 사용하는 참고 지표예요."
          >
            <GuideGradeScale type="score" />
          </GuideItem>
          <GuideItem
            title="주변 상권"
            unit="장소 수·검색 밀도 기준"
            description="역 주변에서 확인되는 카페, 식당, 문화시설 등의 수와 검색 결과 밀도를 함께 비교해요."
          >
            <GuideGradeScale type="commercial" />
          </GuideItem>
          <GuideItem
            title="노선 접근성"
            unit="100점 기준"
            description="후보역의 이용 가능 노선, 출발지 노선과의 연결 관계, 환승 거점성을 함께 반영해요. 개인별 실제 환승 횟수가 적다는 뜻과는 달라요."
          >
            <GuideGradeScale type="score" />
          </GuideItem>
        </div>

        <p className="mt-4 break-keep text-xs leading-5 text-slate-500">
          추천 순위는 서비스 내부의 철도망과 후보 비교 기준으로 먼저 계산해요. 결과 카드의 이동시간과 환승
          경로는 추천이 끝난 뒤 공공 시간표에서 별도로 조회하므로, 시간표 결과가 추천 순위를 다시 바꾸지는
          않아요.
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

function GuideProcessStep({ number, title, description }) {
  return (
    <article className="flex gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#5A45E8] text-xs font-black text-white">
        {number}
      </span>
      <div>
        <h4 className="text-sm font-black text-slate-800">{title}</h4>
        <p className="mt-1 break-keep text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </article>
  )
}

function GuideResultType({ title, description }) {
  return (
    <article className="rounded-xl border border-[#E6E0FF] bg-white px-3.5 py-3.5">
      <strong className="block text-sm font-black leading-5 text-[#5A45E8]">{title}</strong>
      <p className="mt-2 break-keep text-xs leading-5 text-slate-500">{description}</p>
    </article>
  )
}

function GuideItem({ title, unit, description, children }) {
  return (
    <section className="rounded-xl border border-slate-100 bg-white px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-slate-800">{title}</h3>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500">
          {unit}
        </span>
      </div>
      <p className="mt-1.5 break-keep text-xs leading-5 text-slate-500">{description}</p>
      {children}
    </section>
  )
}

function GuideGradeScale({ type }) {
  const grades = type === 'commercial'
    ? [
        ['매우 풍부', '약 1,100곳 이상'],
        ['풍부', '약 750곳 이상'],
        ['충분', '약 450곳 이상'],
        ['보통', '약 180곳 이상'],
        ['적음', '그 미만'],
      ]
    : [
        ['매우 좋음', '85~100점'],
        ['좋음', '70~84점'],
        ['보통', '50~69점'],
        ['아쉬움', '0~49점'],
      ]

  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label="등급 기준">
      {grades.map(([label, range]) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-1.5 text-[11px] font-bold text-slate-500"
        >
          <strong className={getMetricStatusTextClass(label)}>{label}</strong>
          <span>{range}</span>
        </span>
      ))}
      {type === 'commercial' ? (
        <p className="w-full break-keep text-[11px] leading-5 text-slate-400">
          장소 수는 대표 기준이며 검색 결과 밀도가 높으면 상위 등급으로 표시될 수 있어요.
        </p>
      ) : null}
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
          className="rounded-full border px-2.5 py-0.5 text-[11px] font-black"
          style={getLineChipStyle(line)}
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
  timeBalanceStatus = '조회 중',
}) {
  if (!station) return null

  const Component = onClick ? 'button' : 'div'
  const scores = getStationDisplayScores(station)
  const reasons = getRecommendationReasons(station, scores, primary, timeBalanceStatus)

  if (primary) {
    return (
      <Component
        type={onClick ? 'button' : undefined}
        onClick={onClick}
          className={`flex h-full w-full flex-col rounded-2xl border border-violet-100 bg-white px-4 pb-2.5 pt-4 text-left shadow-[0_14px_36px_rgba(90,69,232,0.10)] transition active:scale-[0.99] md:p-4 ${
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
            <MetricSummaryItem label="이동시간 균형" value={timeBalanceStatus} />
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
        className={`flex h-full w-full flex-col rounded-2xl border border-slate-100 bg-white/90 p-4 text-left shadow-sm transition active:scale-[0.99] md:p-4 ${
        selected ? 'ring-2 ring-violet-100' : ''
      } ${onClick ? 'cursor-pointer hover:border-violet-200' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center rounded-full border border-violet-100 bg-[#F6F3FF] px-3 py-1.5 text-xs font-black text-[#5A45E8]">
          지도상 가장 중간인 역
        </span>
      </div>

      <h2 className="mt-3 break-keep text-2xl font-black tracking-tight text-slate-950 md:text-[28px]">
        {station.name}
      </h2>
      <p className="mt-2 max-w-sm break-keep text-xs leading-5 text-slate-500 md:text-[13px] md:leading-5">
        출발지 위치를 기준으로 계산한 지도상 중간점에 가장 가까운 역이에요.
      </p>

      <div className="mt-6">
        <div className="divide-y divide-slate-100 border-y border-slate-100">
          <HorizontalMetricRow
            label="주변 상권"
            value={getCommercialMetricStatus(station)}
          />
          <HorizontalMetricRow
            label="노선 접근성"
            value={getMetricStatus(scores.transit)}
          />
        </div>
      </div>

      <div className="mt-auto rounded-xl bg-[#F6F3FF] px-3 py-2 text-[11px] font-bold leading-5 text-[#8A7BD8] md:text-xs">
        지도상 가장 중간인 역을 원한다면 {station.name}을 참고해보세요.
      </div>
    </Component>
  )
}

function HorizontalMetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <span className={`text-sm font-black ${getMetricStatusTextClass(value)}`}>{value}</span>
    </div>
  )
}

function MobileFairStationCard({ station, collapsed, selected, onSelect, onToggle }) {
  if (!station) return null

  const scores = getStationDisplayScores(station)

  return (
    <div
      className={`rounded-2xl border border-slate-100 bg-white/95 p-3 text-left shadow-[0_8px_22px_rgba(15,23,42,0.04)] lg:hidden ${
        selected ? 'ring-2 ring-violet-100' : ''
      }`}
    >
      {collapsed ? (
        <div className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span className="min-w-0 truncate text-[11px] font-black text-[#5A45E8]">
            위치상 가장 중간인 역
          </span>
          <button
            type="button"
            onClick={onSelect}
            className="justify-self-center text-center active:opacity-70"
          >
            <span className="block whitespace-nowrap text-base font-black tracking-tight text-slate-950">
              {station.name}
            </span>
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="justify-self-end rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-500 active:bg-slate-50"
            aria-expanded="false"
          >
            펼치기
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-black text-[#5A45E8]">
              지도상 가장 중간인 역
            </span>
            <button
              type="button"
              onClick={onToggle}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-500 active:bg-slate-50"
              aria-expanded="true"
            >
              접기
            </button>
          </div>

          <div className="mt-2.5 flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onSelect}
              className="min-w-0 text-left active:opacity-70"
            >
              <span className="block break-keep text-[15px] font-black tracking-tight text-slate-950 sm:text-lg">
                {station.name}
              </span>
            </button>
            <StationLineChips station={station} className="min-w-0 gap-1.5" />
          </div>

          <p className="mt-2 text-[13px] leading-5 text-slate-500 sm:text-xs">
            중간점에서 {formatDistance(station.distanceFromCenter)} · 상권 약 {station.hotPlaceCount}곳
          </p>

          <div className="mt-2.5 grid grid-cols-2 gap-0">
            <MiniMetric label="주변 상권" value={getCommercialMetricStatus(station)} />
            <MiniMetric label="노선 접근" value={getMetricStatus(scores.transit)} />
          </div>

          <div className="mt-3 rounded-xl bg-[#F6F3FF] px-3 py-2 text-[11px] font-bold leading-5 text-[#8A7BD8]">
            지도상 중간 위치를 중요하게 본다면 {station.name}을 참고해보세요.
          </div>
        </>
      )}
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

function StationCard({ station, selected, onClick, timeBalanceStatus = '조회 중' }) {
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
            <StationLineChips station={station} />
            <div className="min-w-0">
              <strong className="mt-2 block min-w-0 break-keep text-[15px] font-black tracking-tight text-slate-950 sm:text-lg">{station.name}</strong>
            </div>
          </div>
        </div>
  
        <p className="mt-2 text-[13px] leading-5 text-slate-500 sm:text-xs">
        중간점에서 {formatDistance(station.distanceFromCenter)} · 상권 약 {station.hotPlaceCount}곳
      </p>

      <div className="mt-2.5 grid grid-cols-3 gap-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/40">
        <MiniMetric label="이동시간 균형" value={timeBalanceStatus} />
        <MiniMetric label="주변 상권" value={getCommercialMetricStatus(station)} />
        <MiniMetric label="노선 접근" value={getMetricStatus(scores.transit)} />
      </div>
    </button>
  )
}

function MiniMetric({ label, value }) {
  return (
    <div className="min-w-0 border-r border-slate-100 px-1.5 py-2 text-center last:border-r-0">
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

function getStationTimeBalanceKey(station) {
  return station?.id || station?.name || ''
}

function isSameTransitStation(firstStationName, secondStationName) {
  const normalize = (stationName) =>
    String(stationName || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/역$/, '')

  const first = normalize(firstStationName)
  const second = normalize(secondStationName)
  return Boolean(first && second && first === second)
}

function getPublicTransitTimeBalanceScore(minutes) {
  const validMinutes = minutes.filter(Number.isFinite)
  if (validMinutes.length < 2) return null

  const averageMinutes =
    validMinutes.reduce((sum, value) => sum + value, 0) / validMinutes.length
  if (averageMinutes <= 0) return 100

  const spreadMinutes = Math.max(...validMinutes) - Math.min(...validMinutes)
  return Math.max(0, Math.min(100, Math.round(100 - (spreadMinutes / averageMinutes) * 100)))
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

function getRecommendationReasons(station, scores, primary = false, timeBalanceStatus = '') {
  const reasons = []
  const lines = getStationLineLabels(station)
  const linesText = lines.slice(0, 2).join(' · ')
  const hotPlaceCount = station.hotPlaceCount || 0
  const hotPlaceSignal = station.hotPlaceSignal || 0

  if (primary) {
    if (timeBalanceStatus === '매우 좋음' || timeBalanceStatus === '좋음') {
      reasons.push('최신 시간표 기준 출발지별 이동시간 차이가 크지 않아요.')
    } else if (timeBalanceStatus === '보통') {
      reasons.push('이동시간 균형은 보통이며, 상권과 접근성이 이를 보완해요.')
    } else if (timeBalanceStatus === '아쉬움') {
      reasons.push('이동시간 차이는 있지만 실제로 만나기 좋은 조건을 함께 고려했어요.')
    } else if (timeBalanceStatus === '조회 중') {
      reasons.push('최신 시간표로 출발지별 이동시간 균형을 확인하고 있어요.')
    }
  } else if (scores.fairness >= 80) {
    reasons.push('출발지 사이의 거리 균형이 비교적 좋아요.')
  } else if (scores.fairness >= 55) {
    reasons.push('거리 균형은 무난하고, 상권과 접근성이 보완돼요.')
  } else if (scores.commercial >= 70 || scores.transit >= 70) {
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

function getLineChipStyle(line) {
  const theme = getSubwayLineTheme(line)

  return {
    color: theme.textColor || theme.color,
    borderColor: `${theme.color}55`,
    backgroundColor: mixLineColorWithWhite(theme.color, 0.12),
  }
}

function mixLineColorWithWhite(hexColor, strength) {
  const normalizedHex = hexColor.replace('#', '')
  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalizedHex.slice(offset, offset + 2), 16))
  const mixedChannels = channels.map((channel) =>
    Math.round(255 + (channel - 255) * strength)
      .toString(16)
      .padStart(2, '0'),
  )

  return `#${mixedChannels.join('')}`
}

function getSubwayLineTheme(line = '') {
  const normalizedLine = String(line).replace(/\s+/g, '')
  const themes = [
    ['인천1호선', '#7CA8D5'],
    ['인천2호선', '#ED8B00'],
    ['경의중앙', '#77C4A3'],
    ['수인분당', '#F5A200'],
    ['신분당', '#D4003B'],
    ['김포골드', '#A17800'],
    ['공항', '#0090D2'],
    ['경춘', '#0C8E72'],
    ['경강', '#003DA5'],
    ['서해', '#8FC31F'],
    ['에버라인', '#6FB245'],
    ['의정부', '#FDA600'],
    ['우이신설', '#B0CE18'],
    ['신림', '#6789CA'],
    ['GTX-A', '#9A6292'],
    ['자기부상', '#FFCD12'],
    ['분당', '#F5A200'],
    ['1호선', '#0052A4'],
    ['2호선', '#00A84D'],
    ['3호선', '#EF7C1C'],
    ['4호선', '#00A5DE'],
    ['5호선', '#996CAC'],
    ['6호선', '#CD7C2F'],
    ['7호선', '#747F00'],
    ['8호선', '#E6186C'],
    ['9호선', '#BDB092', '#756B46'],
  ]
  const matchedTheme = themes.find(([name]) => normalizedLine.includes(name))

  if (!matchedTheme) return { color: '#94A3B8', textColor: '#64748B' }

  return {
    color: matchedTheme[1],
    textColor: matchedTheme[2] || matchedTheme[1],
  }
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

function createReferenceShareUrl({ origins, referenceMidpoint, selectedReferenceAreaId }) {
  const shareUrl = new URL(PUBLIC_APP_URL)
  const practicalAreas = referenceMidpoint.practicalAreas || []
  const selectedAreaIndex = Math.max(
    0,
    practicalAreas.findIndex((area) => area.id === selectedReferenceAreaId),
  )
  const compactPayload = [
    2,
    origins.map(packSharedOriginV3),
    [
      roundShareNumber(referenceMidpoint.lat, 6),
      roundShareNumber(referenceMidpoint.lng, 6),
      referenceMidpoint.regionName,
      practicalAreas.map((area) => [
        area.name,
        area.address,
        roundShareNumber(area.lat, 6),
        roundShareNumber(area.lng, 6),
        area.kind,
        roundShareNumber(area.commercialCount),
        area.regionName,
        roundShareNumber(area.distanceFromCenter),
      ]),
      selectedAreaIndex,
    ],
  ]

  shareUrl.searchParams.set('reference', encodeCompressedPayload(compactPayload))
  return shareUrl.toString()
}

function readSharedResult() {
  try {
    const searchParams = new URLSearchParams(window.location.search)
    const encodedReference = searchParams.get('reference')

    if (encodedReference) {
      const payload = decodeCompressedPayload(encodedReference)
      const origins = (payload?.[1] || []).map(unpackSharedOriginV3)
      const midpoint = payload?.[2]

      if (
        payload?.[0] === 2 &&
        origins.length >= MIN_ORIGIN_COUNT &&
        !origins.some(isBlockedOrigin) &&
        Number.isFinite(midpoint?.[0]) &&
        Number.isFinite(midpoint?.[1])
      ) {
        const practicalAreas = (midpoint[3] || []).map((area, index) => ({
          id: `shared-reference-area-${index}`,
          name: area[0],
          address: area[1],
          lat: area[2],
          lng: area[3],
          kind: area[4],
          commercialCount: area[5],
          regionName: area[6] || area[1],
          distanceFromCenter: area[7],
          mapLabel: index === 0 ? '참고' : `후보 ${index + 1}`,
        }))
        const selectedAreaIndex = Math.min(
          Math.max(Number(midpoint[4]) || 0, 0),
          Math.max(practicalAreas.length - 1, 0),
        )

        return {
          origins,
          recommendedStations: [],
          fairStations: [],
          selectedStationId: null,
          referenceMidpoint: {
            id: 'reference-midpoint',
            name: '지도상 중간지점',
            mapLabel: '중간',
            lat: midpoint[0],
            lng: midpoint[1],
            regionName: midpoint[2] || '중간지점 주변',
            practicalAreas,
          },
          selectedReferenceAreaId: practicalAreas[selectedAreaIndex]?.id || null,
        }
      }
    }

    const encodedPayload = new URLSearchParams(window.location.search).get('result')
    if (!encodedPayload) return null

    const payload = decodeSharePayload(encodedPayload)
    const hasValidOrigins =
      Array.isArray(payload.origins) &&
      payload.origins.length >= MIN_ORIGIN_COUNT &&
      !payload.origins.some(isBlockedOrigin)
    const hasValidStations =
      Array.isArray(payload.recommendedStations) && payload.recommendedStations.length > 0

    return hasValidOrigins && hasValidStations ? payload : null
  } catch {
    return null
  }
}

function encodeCompressedPayload(payload) {
  const compressedBytes = gzipSync(strToU8(JSON.stringify(payload)), { level: 9 })
  const binary = Array.from(compressedBytes, (byte) => String.fromCharCode(byte)).join('')

  return `z${window.btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}`
}

function decodeCompressedPayload(encodedPayload) {
  const payloadBase64 = encodedPayload.startsWith('z')
    ? encodedPayload.slice(1)
    : encodedPayload
  const base64 = payloadBase64.replaceAll('-', '+').replaceAll('_', '/')
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = window.atob(paddedBase64)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  const json = encodedPayload.startsWith('z')
    ? strFromU8(gunzipSync(bytes))
    : new TextDecoder().decode(bytes)

  return JSON.parse(json)
}

function pickSharedOrigin(origin) {
  return {
    id: origin.id,
    address: origin.address,
    routeName: origin.routeName,
    nearbyStationName: origin.nearbyStationName,
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
    origin.nearbyStationName || '',
  ]
}

function unpackSharedOriginV3(origin, index) {
  return {
    id: `shared-origin-${index}`,
    address: origin[0],
    routeName: origin[0],
    nearbyStationName: origin[3] || '',
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
