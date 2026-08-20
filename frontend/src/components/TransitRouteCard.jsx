import { useEffect, useMemo, useState } from 'react'
import { getStationDisplayTransitTimeProfile } from '../data/subwayTravelTimeGraph'
import { fetchTransitRouteWithRetry } from '../services/transitApi'
import { createKakaoDirectionUrl, createNaverSearchUrl } from '../utils/mapDirectionUrls'
import {
  getLineChipStyle,
  getSubwayLineDisplayName,
  getSubwayLineTheme,
} from '../utils/subwayLineTheme'
import { isSameTransitStation } from '../utils/transitStation'

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
            ? '서울교통공사 시간표 기준 · 역간 지하철 이동시간'
            : '일부 경로 임시 예상시간 기준'}
      </p>

      <div className="md:hidden">
        <div
          className="mb-2 grid overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 p-1"
          style={{ gridTemplateColumns: `repeat(${estimatedItems.length}, minmax(0, 1fr))` }}
          role="tablist"
          aria-label="출발지별 참고 경로"
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
                {item.source === 'SEOUL_METRO_PUBLIC_DATA' ? '참고 경로' : '예상시간'}
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
                  ? '참고 경로시간'
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
                {formatTransitStationName(step.station)}
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
                <span className="truncate">{getSubwayLineDisplayName(step.line)}</span>
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

function formatTransitStationName(stationName) {
  const normalizedName = String(stationName || '').trim()
  if (!normalizedName) return ''
  return normalizedName.endsWith('역') ? normalizedName : `${normalizedName}역`
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

export default TransitTimeEstimateCard
