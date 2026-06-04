import { useEffect, useMemo, useState } from 'react'
import AddressInput from './components/AddressInput'
import KakaoMap from './components/KakaoMap'
import MapDirections from './components/MapDirections'
import PlaceList from './components/PlaceList'
import { searchNearbyPlaces, searchRecommendedStations } from './services/kakaoApi'
import { calculateMidpoint } from './services/midpointCalculator'

const PLACE_CATEGORY_LABELS = {
  all: '전체',
  cafe: '카페',
  restaurant: '밥집',
  bar: '술집',
  activity: '놀거리',
}

const PLACE_CATEGORY_KEYS = ['all', 'cafe', 'restaurant', 'bar', 'activity']

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
      const stationKey = getStationMapKey(station)

      stationMap.set(stationKey, {
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
  const hasSamePrimaryAndFairStation = primaryStation && fairStation && isSameStation(primaryStation, fairStation)
  const fairStationNeedsContext = fairStation && isWeakMeetingArea(fairStation)
  const showMeetingTradeoffNotice = fairStationNeedsContext
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

    window.addEventListener('meetmiddle:help-tooltip-open', handleOpenTooltip)
    window.addEventListener('meetmiddle:help-tooltip-close', handleCloseTooltip)

    return () => {
      window.removeEventListener('meetmiddle:help-tooltip-open', handleOpenTooltip)
      window.removeEventListener('meetmiddle:help-tooltip-close', handleCloseTooltip)
    }
  }, [])

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
    setOrigins([])
    setRecommendedStations([])
    setFairStations([])
    setSelectedStationId(null)
    setPlaces([])
    setSelectedPlaceCategory(null)
    setError('')
  }

  const handleRemoveOrigin = (index) => {
    if (originInputs.length <= MIN_ORIGIN_COUNT) return

    setOriginInputs((prev) => prev.filter((_, idx) => idx !== index))
    setOrigins([])
    setRecommendedStations([])
    setFairStations([])
    setSelectedStationId(null)
    setPlaces([])
    setSelectedPlaceCategory(null)
    setError('')
  }

  const handleResetSearch = () => {
    setOriginInputs(Array.from({ length: MIN_ORIGIN_COUNT }, createEmptyOrigin))
    setOrigins([])
    setRecommendedStations([])
    setFairStations([])
    setSelectedStationId(null)
    setPlaces([])
    setSelectedPlaceCategory(null)
    setError('')
    setPlaceError('')
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
      const center = calculateMidpoint(selectedOrigins)
      const recommendation = await searchRecommendedStations(center, selectedOrigins, 4)
      const stations = Array.isArray(recommendation) ? recommendation : recommendation.meetingStations
      const fairResults = Array.isArray(recommendation) ? [] : recommendation.fairStations

      if (!stations.length) {
        throw new Error('계산된 중간 지점 주변에서 추천역을 찾지 못했습니다.')
      }

      setOrigins(selectedOrigins)
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

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 py-5 md:px-6 md:py-8">
      <div data-reveal-root className="mx-auto w-full max-w-3xl space-y-4 pb-8">
        <header className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 shadow-sm">
          <div className="absolute right-[-36px] top-[-48px] h-36 w-36 rounded-full bg-blue-200/45" />
          <div className="absolute bottom-[-44px] right-16 h-24 w-24 rounded-full bg-cyan-200/45" />
          <div className="relative">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-bold text-[#3182F6]">MeetMiddle</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#3182F6] shadow-sm">
                약속역 추천
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">우리 모두의 약속역 찾기</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              출발지를 입력하면 거리 균형과 주변 상권을 함께 보고, 실제로 만나기 좋은 역을 추천해드려요.
            </p>
          </div>
        </header>

        <section className="relative z-[80] rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
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
            className="mt-5 w-full rounded-2xl bg-[#3182F6] px-4 py-4 text-base font-bold text-white shadow-[0_12px_28px_rgba(49,130,246,0.28)] transition hover:bg-blue-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-blue-200 disabled:shadow-none"
          >
            {loading ? `추천 후보를 찾는 중${loadingDots}` : '만나기 좋은 역 찾기'}
          </button>

          {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p> : null}
        </section>

        {showResults ? (
          <>
            {showMeetingTradeoffNotice ? (
              <MeetingTradeoffNotice practicalStation={primaryStation} fairStation={fairStation} />
            ) : null}

            {fairStation ? (
              <section className={`relative grid gap-3 md:grid-cols-[3fr_2fr] ${helpTooltipActive ? 'z-[120]' : 'z-40'}`}>
                <ResultTypeCard
                  eyebrow="가장 만나기 좋은 장소"
                  eyebrowIcon="♕"
                  station={primaryStation}
                  description="상권과 거리 균형을 함께 보고 고른 대표 추천역이에요."
                  selected={recommendedStations[0]?.id === selectedStation.id}
                  onClick={() => handleStationSelect(recommendedStations[0].id)}
                  primary
                />
                <ResultTypeCard
                  eyebrow="🚇 거리 기준 중간역"
                  station={fairStation}
                  description="출발지들의 이동 거리가 가장 비슷한 역이에요."
                  selected={fairStation.id === selectedStation.id}
                  onClick={() => handleStationSelect(fairStation.id)}
                />
              </section>
            ) : null}

            {alternativeStations.length ? (
              <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">다른 추천 후보 TOP3</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      상권이 어느 정도 있는 후보만 보여드려요. 탭하면 지도와 길찾기 기준역이 바뀌어요.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {alternativeStations.map((station, index) => (
                    <StationCard
                      key={station.id}
                      station={{
                        ...station,
                        rank: index + 1,
                      }}
                      selected={station.id === selectedStation.id}
                      onClick={() => handleStationSelect(station.id)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-slate-950">지도에서 보기</h2>
              <KakaoMap origins={origins} meetingPoint={selectedStation} meetingPoints={mapStations} />
            </section>

            <MapDirections origins={origins} station={selectedStation} />

            <section id="places" className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-[#3182F6]">추천 만남 장소</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {selectedStation.name} 근처 장소 추천
                  </h2>
                </div>

                <div className="grid grid-cols-5 rounded-2xl bg-slate-100 p-1">
                  {PLACE_CATEGORY_KEYS.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handlePlaceRecommendation(category)}
                      disabled={placeLoading}
                      className={`rounded-xl px-3 py-2.5 text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                        selectedPlaceCategory === category
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      {PLACE_CATEGORY_LABELS[category]}
                    </button>
                  ))}
                </div>

                {!selectedPlaceCategory ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    카페, 밥집, 술집, 놀거리 중에서 {selectedStation.name} 근처 장소를 추천받아보세요.
                  </p>
                ) : null}
                {placeLoading ? <p className="text-sm text-slate-500">근처 장소를 찾는 중...</p> : null}
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
          <section className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <div className="h-6 w-6 rounded-full border-4 border-[#3182F6] bg-white shadow-sm" />
            </div>
            출발지를 선택하면 만나기 좋은 역과 거리 기준 중간역이 표시됩니다.
          </section>
        )}
      </div>
    </main>
  )
}

function MeetingTradeoffNotice({ practicalStation, fairStation }) {
  const hasSeparatePracticalStation = practicalStation && !isSameStation(practicalStation, fairStation)

  return (
    <section className="rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-sm shadow-sm md:px-4">
      <p className="text-sm font-black text-amber-700">
        {hasSeparatePracticalStation ? '⚠️ 공평한 중간역은 약속 장소로 아쉬워요' : '⚠️ 주변 상권이 부족할 수 있습니다'}
      </p>
      <p className="mt-1.5 text-sm leading-5 text-amber-900">
        {hasSeparatePracticalStation ? (
          <>
            가장 공평한 중간역은 <strong>{fairStation.name}</strong>이지만, 주변 상권이 부족할 수 있어요.{' '}
            실제로 만나기엔 <strong>{practicalStation.name}</strong> 쪽을 함께 비교해보세요.
          </>
        ) : (
          <>
            <strong>{fairStation.name}</strong>은 거리 균형 기준으로 좋은 후보지만, 실제 약속 장소로는 근처
            카페나 식당이 적을 수 있어요.
          </>
        )}
      </p>
    </section>
  )
}

function ResultTypeCard({ eyebrow, station, description, selected = false, onClick, primary = false, eyebrowIcon = null }) {
  if (!station) return null

  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex min-h-[220px] w-full flex-col rounded-2xl border p-5 text-left shadow-sm transition active:scale-[0.99] ${
        primary
          ? 'border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50'
          : 'border-slate-100 bg-white'
      } ${selected ? 'ring-2 ring-blue-200' : ''} ${onClick ? 'cursor-pointer hover:border-blue-200' : ''}`}
    >
      <div className="flex-1">
        <p className="inline-flex items-center gap-1 text-sm font-bold text-[#3182F6]">
          {eyebrowIcon ? <span className="text-amber-400">{eyebrowIcon}</span> : null}
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{station.name}</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Metric
          label="약속 적합도"
          value={`${Math.round(station.meetingPlaceScore || 0)}점`}
          help={{
            title: '약속 적합도',
            body: '실제로 만나기 좋은 장소인지 보는 점수예요. 카페·맛집·놀거리, 주변 상권, 사람들이 자주 만나는 역인지 등을 함께 봅니다.',
            levels: ['80점 이상: 매우 추천', '60~79점: 무난함', '40~59점: 간단한 만남 가능', '39점 이하: 상권이 적어 아쉬움'],
          }}
        />
        <Metric
          label="중간 허브도"
          value={`${Math.round(station.middleHubScore || 0)}점`}
          help={{
            title: '중간 허브도',
            body: '여러 출발지에서 접근하기 쉬운 정도예요. 환승 편의성, 노선 연결성, 수도권 중심 접근성을 함께 봅니다.',
            levels: ['80점 이상: 주요 허브역', '60~79점: 접근성 좋음', '40~59점: 일반 역', '39점 이하: 외곽/접근성 낮음'],
          }}
        />
      </div>
    </Component>
  )
}

function Metric({ label, value, help }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 shadow-sm ring-1 ring-slate-100">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm font-black text-slate-950">{value}</p>
      {help ? <HelpTooltip {...help} /> : null}
    </div>
  )
}

function HelpTooltip({ title, body, levels }) {
  const openTooltip = () => {
    window.dispatchEvent(new Event('meetmiddle:close-address-dropdowns'))
    window.dispatchEvent(new Event('meetmiddle:help-tooltip-open'))
  }

  const closeTooltip = () => {
    window.dispatchEvent(new Event('meetmiddle:help-tooltip-close'))
  }

  return (
    <span className="group relative inline-flex" onMouseEnter={openTooltip} onMouseLeave={closeTooltip}>
      <button
        type="button"
        aria-label={`${title} 설명`}
        onBlur={closeTooltip}
        onFocus={openTooltip}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-500 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-[#3182F6] focus:bg-blue-50 focus:text-[#3182F6] focus:outline-none"
      >
        ?
      </button>
      <span className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] right-0 z-[300] hidden w-64 rounded-2xl bg-slate-950 p-3 text-left text-xs leading-5 text-white shadow-2xl group-hover:block group-focus-within:block">
        <strong className="mb-1 block text-sm">{title}</strong>
        <span className="block text-slate-200">{body}</span>
        <span className="mt-2 block space-y-0.5 text-slate-300">
          {levels.map((level) => (
            <span key={level} className="block">
              {level}
            </span>
          ))}
        </span>
      </span>
    </span>
  )
}

function StationCard({ station, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-2.5 text-left transition active:scale-[0.98] ${
        selected
          ? 'border-blue-200 bg-blue-50 shadow-sm'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#3182F6] shadow-sm">
          #{station.rank}
        </span>
        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500">
          {Math.round(station.meetingPlaceScore || 0)}점
        </span>
      </div>
      <strong className="mt-2 block text-lg text-slate-950">{station.name}</strong>
      <div className="mt-2 space-y-0.5 text-xs text-slate-500">
        <p>중간점에서 {formatDistance(station.distanceFromCenter)}</p>
        <p>상권 약 {station.hotPlaceCount}곳</p>
      </div>
    </button>
  )
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

function isSameStation(a, b) {
  return getStationMapKey(a) === getStationMapKey(b)
}

function isWeakMeetingArea(station) {
  return (station.meetingPlaceScore || 0) < 50 || (station.hotPlaceCount || 0) < 10
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
    PLACE_CATEGORY_KEYS.filter((category) => category !== 'all').map((category) =>
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
