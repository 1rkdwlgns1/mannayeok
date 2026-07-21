import { useEffect, useMemo, useRef, useState } from 'react'
import AddressInput from './components/AddressInput'
import KakaoMap from './components/KakaoMap'
import MapDirections from './components/MapDirections'
import OnboardingScreen from './components/OnboardingScreen'
import PlaceList from './components/PlaceList'
import backgroundImage from './assets/background.png'
import logoImage from './assets/rogo.png'
import { getStationLines } from './data/subwayStationLines'
import { enrichOriginsWithNearbyStations, searchNearbyPlaces, searchRecommendedStations } from './services/kakaoApi'
import { calculateMidpoint } from './services/midpointCalculator'

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
const MIN_RECOMMENDATION_HOT_PLACE_COUNT = 50

let nextOriginInputId = 0

const createEmptyOrigin = () => ({
  id: `origin-${nextOriginInputId++}`,
  query: '',
  selected: null,
})

function App() {
  const [originInputs, setOriginInputs] = useState(
    Array.from({ length: MIN_ORIGIN_COUNT }, createEmptyOrigin),
  )
  const [origins, setOrigins] = useState([])
  const [recommendedStations, setRecommendedStations] = useState([])
  const [fairStations, setFairStations] = useState([])
  const [selectedStationId, setSelectedStationId] = useState(null)
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
  const [hasStarted, setHasStarted] = useState(false)
  const [isOnboardingLeaving, setIsOnboardingLeaving] = useState(false)
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

  if (!hasStarted) {
    return <OnboardingScreen onStart={handleStartApp} isLeaving={isOnboardingLeaving} />
  }

  return (
    <main
      className="app-enter min-h-screen overflow-x-hidden bg-[#F8FAFC] px-2.5 py-3 md:px-6 md:py-8"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(248,250,252,0.80) 0%, rgba(248,250,252,0.54) 50%, rgba(248,250,252,0.86) 100%), url(${backgroundImage})`,
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      <div data-reveal-root className="mx-auto w-full max-w-4xl space-y-4 pb-8 md:space-y-5">
        <div className="mx-auto w-full max-w-4xl space-y-4 md:space-y-5">
          <div className="relative flex items-start justify-between px-0 py-0">
            <span className="block h-16 w-64 overflow-visible md:h-20 md:w-72" aria-label="만나역" role="img">
              <img
                src={logoImage}
                alt=""
                className="h-full w-full origin-left -translate-x-10 translate-y-1 scale-[1.95] object-contain object-left md:-translate-x-11 md:translate-y-1.5 md:scale-[2.15]"
              />
            </span>
            <BetaBadge className="mt-3 md:mt-4" />
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
            {primaryStation ? (
              <section className={`relative grid items-start gap-3 lg:grid-cols-[1.08fr_0.92fr] ${helpTooltipActive ? 'z-[120]' : 'z-40'}`}>
                <ResultTypeCard
                  eyebrow="가장 만나기 좋은 장소"
                  eyebrowIcon="trophy"
                  station={primaryStation}
                  description="위치, 접근성, 주변 장소를 종합해 추천한 역이에요."
                  selected={primaryStation.id === selectedStation.id}
                  onClick={() => handleStationSelect(primaryStation.id)}
                  primary
                />
                {fairStation ? (
                  <>
                    <MobileFairStationCard
                      station={fairStation}
                      collapsed={fairStationCollapsed}
                      onToggle={() => setFairStationCollapsed((collapsed) => !collapsed)}
                    />
                    <div className="hidden lg:block">
                      <ResultTypeCard
                        eyebrow="위치상 가장 중간인 역"
                        eyebrowMeta="지도상 중간 기준"
                        eyebrowIcon="scales"
                        station={fairStation}
                        description="출발지 위치를 기준으로 가장 중간에 가까운 역이에요."
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

                <div className="flex gap-7 overflow-x-auto border-b border-slate-100 pt-2 [scrollbar-width:none] md:gap-9 [&::-webkit-scrollbar]:hidden">
                  {PLACE_CATEGORY_KEYS.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handlePlaceRecommendation(category)}
                      disabled={placeLoading}
                      className={`relative shrink-0 pb-2.5 text-[15px] font-black transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60 ${
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
          <section className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-50">
              <div className="h-5 w-5 rounded-full border-4 border-[#5A45E8] bg-white shadow-sm" />
            </div>
            <h2 className="text-base font-black text-slate-950">어디서 만날까요?</h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-slate-500">
              출발지 사이의 위치 균형과 주변 상권을 함께 보고, 만나기 좋은 역을 추천해드려요.
            </p>
          </section>
        )}
      </div>
    </main>
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

function getCategoryMarker(category) {
  if (category === 'all') return '▦'
  if (category === 'cafe') return '☕'
  if (category === 'restaurant') return '🍖'
  if (category === 'bar') return '🍺'
  if (category === 'activity') return '🎮'

  return '•'
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

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/80 px-2.5 py-2 shadow-sm ring-1 ring-blue-50">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-xs font-black text-slate-800">{value}</p>
    </div>
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

function HeroPreview() {
  return (
    <div className="relative hidden min-h-[220px] md:block">
      <div className="absolute inset-x-3 top-3 h-44 rounded-[2rem] bg-white/55 shadow-inner ring-1 ring-white/70">
        <div className="absolute left-6 top-10 h-24 w-24 rounded-full border-8 border-blue-100" />
        <div className="absolute right-8 top-8 h-28 w-28 rounded-full border-8 border-cyan-100" />
        <div className="absolute left-20 top-20 h-1 w-44 rotate-[-18deg] rounded-full bg-[#3182F6]/45" />
        <div className="absolute left-32 top-8 h-1 w-36 rotate-[38deg] rounded-full bg-[#00A84D]/35" />
        <div className="absolute right-16 top-20 h-1 w-32 rotate-[62deg] rounded-full bg-amber-300/60" />
      </div>

      <div className="absolute left-3 top-8 w-64 rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur">
        <p className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-[#3182F6]">
          오늘의 추천 예시
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">왕십리역</h2>
        <div className="mt-3 space-y-2 text-xs font-bold text-slate-600">
          <div className="flex items-center justify-between">
            <span>위치 균형</span>
            <span className="text-[#3182F6]">상위권</span>
          </div>
          <div className="flex items-center justify-between">
            <span>노선 접근성</span>
            <span className="text-[#00A84D]">좋음</span>
          </div>
          <div className="flex items-center justify-between">
            <span>주변 상권</span>
            <span className="text-amber-500">충분</span>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
          <strong className="text-2xl font-black text-[#3182F6]">★★★★★</strong>
        </div>
      </div>

      <div className="absolute bottom-4 right-3 flex h-20 w-36 items-center justify-center rounded-[1.25rem] bg-slate-900 shadow-xl">
        <div className="relative h-12 w-24 rounded-xl bg-white">
          <div className="absolute left-2 top-2 h-5 w-8 rounded-md bg-blue-100" />
          <div className="absolute right-2 top-2 h-5 w-8 rounded-md bg-blue-100" />
          <div className="absolute bottom-2 left-3 h-2 w-2 rounded-full bg-slate-900" />
          <div className="absolute bottom-2 right-3 h-2 w-2 rounded-full bg-slate-900" />
        </div>
      </div>
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
  eyebrow,
  eyebrowMeta,
  station,
  description,
  selected = false,
  onClick,
  primary = false,
  eyebrowIcon = null,
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
          className={`flex w-full flex-col rounded-2xl border border-violet-100 bg-white p-4 text-left shadow-[0_14px_36px_rgba(90,69,232,0.10)] transition active:scale-[0.99] md:p-4 ${
          selected ? 'ring-2 ring-violet-100' : ''
        } ${onClick ? 'cursor-pointer hover:border-violet-200' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
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

          <div className="mt-3 grid grid-cols-3 border-t border-slate-100 pt-3">
            <MetricSummaryItem icon="people" label="접근 조건" value={getMetricStatus(scores.fairness)} tone="blue" />
            <MetricSummaryItem icon="store" label="주변 상권" value={getCommercialMetricStatus(station)} tone="purple" />
            <MetricSummaryItem icon="subway" label="노선 접근성" value={getMetricStatus(scores.transit)} tone="green" />
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
        <FairMetricRow label="위치 균형" value={getMetricStatus(scores.fairness)} tone="blue" />
        <FairMetricRow label="주변 상권" value={getCommercialMetricStatus(station)} tone="purple" />
        <FairMetricRow label="노선 접근성" value={getMetricStatus(scores.transit)} tone="green" />
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
            <FairMetricRow label="위치 균형" value={getMetricStatus(scores.fairness)} tone="blue" />
            <FairMetricRow label="주변 상권" value={getCommercialMetricStatus(station)} tone="purple" />
            <FairMetricRow label="노선 접근성" value={getMetricStatus(scores.transit)} tone="green" />
          </div>

          <div className="mt-3 rounded-xl bg-[#F6F3FF] px-3 py-2 text-[11px] font-bold leading-5 text-[#8A7BD8]">
            지도상 중간 위치를 중요하게 본다면 {station.name}을 참고해보세요.
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MetricStatusList({ scores }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <StatusMetricRow icon="people" label="위치 균형" description="지도상 출발지 위치의 중간에 가까워요" value={getMetricStatus(scores.fairness)} tone="blue" />
      <StatusMetricRow icon="store" label="주변 상권" description="맛집, 카페, 편의시설이 많아요" value={getMetricStatus(scores.commercial)} tone="purple" />
      <StatusMetricRow icon="subway" label="노선 접근성" description="환승 부담이 적은 편이에요" value={getMetricStatus(scores.transit)} tone="green" />
    </div>
  )
}

function MetricSummaryItem({ icon, label, value, tone = 'blue' }) {
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

function StatusMetricRow({ icon, label, description, value, tone = 'blue', simple = false }) {
  const iconTone = ICON_TONES[tone] || ICON_TONES.blue

  return (
    <div className={`${simple ? 'flex items-center justify-between gap-3' : 'flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 first:pt-0 last:border-b-0 last:pb-0'}`}>
      <span className="inline-flex min-w-0 items-center gap-2.5 text-left">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconTone.bg}`}>
          <Icon name={icon} className="h-4 w-4" style={{ filter: iconTone.filter }} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-black text-slate-700">{label}</span>
          {description ? <span className="mt-0.5 block truncate text-xs font-bold text-slate-400">{description}</span> : null}
        </span>
      </span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${getMetricStatusTextClass(value)}`}>
        {value}
      </span>
    </div>
  )
}

function FairMetricRow({ label, value, tone = 'green' }) {
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

function StatusMetricCard({ icon, label, value, tone = 'blue' }) {
  const iconTone = ICON_TONES[tone] || ICON_TONES.blue

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
      <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconTone.bg}`}>
          <Icon name={icon} className="h-4 w-4" style={{ filter: iconTone.filter }} />
        </span>
        {label}
      </p>
      <p className={`mt-2 text-xl font-black ${getMetricStatusTextClass(value)}`}>
        {value}
      </p>
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
        <MiniMetric label="위치 균형" value={getMetricStatus(scores.fairness)} tone="blue" />
        <MiniMetric label="주변 상권" value={getCommercialMetricStatus(station)} tone="purple" />
        <MiniMetric label="노선 접근" value={getMetricStatus(scores.transit)} tone="green" />
      </div>
    </button>
  )
}

function MiniMetric({ label, value, tone = 'blue' }) {
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
  if (value === '충분') return 'text-[#947EFF]'
  if (value === '보통') return 'text-[#64748B]'
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

  if (count >= 220 || signal >= 320) return '매우 풍부'
  if (count >= 140 || signal >= 220) return '충분'
  if (count >= 60 || signal >= 100) return '보통'
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

  if (hotPlaceCount >= 220 || hotPlaceSignal >= 320) {
    reasons.push('식사, 카페, 편의시설 선택지가 넉넉해 약속 장소로 좋아요.')
  } else if (hotPlaceCount >= 140 || hotPlaceSignal >= 220) {
    reasons.push('주변 상권이 충분해서 약속 장소를 고르기 좋아요.')
  } else if (hotPlaceCount >= 60 || hotPlaceSignal >= 100) {
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
