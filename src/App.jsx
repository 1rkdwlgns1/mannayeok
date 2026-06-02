import { useEffect, useMemo, useState } from 'react'
import AddressInput from './components/AddressInput'
import KakaoMap from './components/KakaoMap'
import MapDirections from './components/MapDirections'
import PlaceList from './components/PlaceList'
import { searchNearbyPlaces, searchRecommendedStations } from './services/kakaoApi'
import { calculateDistanceInMeters, calculateMidpoint } from './services/midpointCalculator'

const PLACE_CATEGORY_LABELS = {
  all: '전체',
  cafe: '카페',
  restaurant: '음식점',
}

const REQUIRED_ORIGIN_COUNT = 2

const createEmptyOrigin = () => ({
  query: '',
  selected: null,
})

function App() {
  const [originInputs, setOriginInputs] = useState(
    Array.from({ length: REQUIRED_ORIGIN_COUNT }, createEmptyOrigin),
  )
  const [origins, setOrigins] = useState([])
  const [recommendedStations, setRecommendedStations] = useState([])
  const [fairStations, setFairStations] = useState([])
  const [selectedStationId, setSelectedStationId] = useState(null)
  const [places, setPlaces] = useState([])
  const [selectedPlaceCategory, setSelectedPlaceCategory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [placeLoading, setPlaceLoading] = useState(false)
  const [error, setError] = useState('')
  const [placeError, setPlaceError] = useState('')

  const selectedStation =
    recommendedStations.find((station) => station.id === selectedStationId) || recommendedStations[0] || null
  const fairStation = fairStations[0] || null

  const mapStations = useMemo(() => {
    const stationMap = new Map()

    ;[...recommendedStations, ...fairStations].forEach((station) => {
      stationMap.set(station.id, station)
    })

    return [...stationMap.values()]
  }, [recommendedStations, fairStations])

  const distances = useMemo(() => {
    if (!selectedStation || !origins.length) return []

    return origins.map((origin) => ({
      address: origin.address,
      distance: calculateDistanceInMeters(origin, selectedStation),
    }))
  }, [selectedStation, origins])

  const selectedOrigins = originInputs.map((origin) => origin.selected).filter(Boolean)
  const hasRequiredSelections = selectedOrigins.length === REQUIRED_ORIGIN_COUNT
  const showResults = Boolean(selectedStation)

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

  const handleAddressChange = (index, value) => {
    setOriginInputs((prev) =>
      prev.map((origin, idx) =>
        idx === index
          ? {
              query: value,
              selected: origin.selected?.address === value ? origin.selected : null,
            }
          : origin,
      ),
    )
  }

  const handleAddressSelect = (index, suggestion) => {
    const address = suggestion.roadAddress || suggestion.address

    setOriginInputs((prev) =>
      prev.map((origin, idx) =>
        idx === index
          ? {
              query: address,
              selected: {
                address,
                lat: suggestion.lat,
                lng: suggestion.lng,
              },
            }
          : origin,
      ),
    )
  }

  const handleCalculate = async () => {
    if (!hasRequiredSelections) {
      setError('두 출발지를 모두 검색 결과에서 선택해주세요.')
      return
    }

    setLoading(true)
    setError('')
    setPlaceError('')

    try {
      const center = calculateMidpoint(selectedOrigins)
      const recommendation = await searchRecommendedStations(center, selectedOrigins, 3)
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
                약속 위치 추천
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">두 사람 중간역 찾기</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              출발지 두 곳을 고르면 거리와 주변 상권을 함께 보고, 실제로 만나기 좋은 역을 추천해드려요.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
          <AddressInput origins={originInputs} onChange={handleAddressChange} onSelect={handleAddressSelect} />

          <button
            type="button"
            onClick={handleCalculate}
            disabled={loading}
            className="mt-5 w-full rounded-2xl bg-[#3182F6] px-4 py-4 text-base font-bold text-white shadow-[0_12px_28px_rgba(49,130,246,0.28)] transition hover:bg-blue-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-blue-200 disabled:shadow-none"
          >
            {loading ? '추천 후보를 찾는 중...' : '추천 중간역 찾기'}
          </button>

          {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p> : null}
        </section>

        {showResults ? (
          <>
            {fairStation ? (
              <section className="grid gap-3 md:grid-cols-2">
                <ResultTypeCard
                  eyebrow="🍽 가장 만나기 좋은 장소"
                  station={recommendedStations[0]}
                  description="상권, 약속 장소 적합도, 중간 거리 균형을 함께 본 추천이에요."
                  primary
                />
                <ResultTypeCard
                  eyebrow="🚇 가장 공평한 중간역"
                  station={fairStation}
                  description="두 출발지에서 최대한 비슷하게 이동할 수 있는 역이에요."
                />
              </section>
            ) : null}

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">추천 후보 TOP3</h2>
                  <p className="mt-1 text-xs text-slate-500">후보를 탭하면 지도와 길찾기 기준역이 바뀌어요.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {recommendedStations.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    selected={station.id === selectedStation.id}
                    onClick={() => handleStationSelect(station.id)}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-slate-950">지도에서 보기</h2>
              <KakaoMap origins={origins} meetingPoint={selectedStation} meetingPoints={mapStations} />
            </section>

            <PlaceList distances={distances} />

            <MapDirections origins={origins} station={selectedStation} />

            <section id="places" className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-[#3182F6]">추천 만남 장소</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {selectedStation.name} 근처 인기 장소 TOP 3
                  </h2>
                </div>

                <div className="grid grid-cols-3 rounded-2xl bg-slate-100 p-1">
                  {['all', 'cafe', 'restaurant'].map((category) => (
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
                    카페나 음식점을 눌러 {selectedStation.name} 근처 장소를 추천받아보세요.
                  </p>
                ) : null}
                {placeLoading ? <p className="text-sm text-slate-500">근처 장소를 찾는 중...</p> : null}
                {placeError ? <p className="text-sm text-red-500">{placeError}</p> : null}
              </div>
            </section>

            {selectedPlaceCategory ? (
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
            출발지 두 곳을 선택하면 추천 장소와 공평한 중간역이 표시됩니다.
          </section>
        )}
      </div>
    </main>
  )
}

function ResultTypeCard({ eyebrow, station, description, primary = false }) {
  if (!station) return null

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        primary
          ? 'border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50'
          : 'border-slate-100 bg-white'
      }`}
    >
      <p className="text-sm font-bold text-[#3182F6]">{eyebrow}</p>
      <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950">{station.name}</h2>
      <p className="mt-1.5 text-sm leading-5 text-slate-600">{description}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label="약속 적합도" value={`${Math.round(station.meetingPlaceScore || 0)}점`} />
        <Metric label="중간 허브도" value={`${Math.round(station.middleHubScore || 0)}점`} />
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-white/90 px-3 py-2 shadow-sm ring-1 ring-slate-100">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold text-slate-950">{value}</p>
    </div>
  )
}

function StationCard({ station, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
        selected
          ? 'border-blue-200 bg-blue-50 shadow-sm'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#3182F6] shadow-sm">
          #{station.rank}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {getStationLabel(station)}
        </span>
      </div>
      <strong className="mt-2.5 block text-xl text-slate-950">{station.name}</strong>
      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <p>중간점에서 {formatDistance(station.distanceFromCenter)}</p>
        <p>상권 약 {station.hotPlaceCount}곳</p>
      </div>
    </button>
  )
}

function getStationLabel(station) {
  if (station.rank === 1) return 'BEST'
  if (station.hotPlaceCount >= 80) return '상권 풍부'
  if (station.distanceFromCenter <= 3000) return '균형 좋음'
  return '대안 후보'
}

async function searchPlacesWithCategory(station, category) {
  const places = await searchNearbyPlaces(station, category)

  return places.map((place) => ({
    ...place,
    categoryLabel: PLACE_CATEGORY_LABELS[category],
  }))
}

async function searchAllNearbyPlaces(station) {
  const [cafes, restaurants] = await Promise.all([
    searchPlacesWithCategory(station, 'cafe'),
    searchPlacesWithCategory(station, 'restaurant'),
  ])

  return [...cafes, ...restaurants].sort((a, b) => a.distance - b.distance).slice(0, 5)
}

function formatDistance(distance) {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)}km`
  }

  return `${distance}m`
}

export default App
