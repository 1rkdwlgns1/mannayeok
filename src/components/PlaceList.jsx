function PlaceList({ distances, places, meetingPointName, placeCategoryLabel }) {
  if (distances) {
    return (
      <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#5A45E8]">거리 비교</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">출발지별 직선거리</h2>
          </div>
          <p className="text-xs text-slate-500">실제 이동시간은 지도앱 기준</p>
        </div>

        <ul className="grid gap-2 md:grid-cols-2">
          {distances.map((item, index) => (
            <li key={index} className="rounded-2xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-100">
              <p className="truncate text-xs font-bold text-slate-500">출발지 {index + 1}</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-bold text-slate-800">{item.address}</span>
                <span className="shrink-0 font-black text-slate-950">{formatDistance(item.distance)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-slate-100 bg-white/95 p-3 shadow-[0_12px_34px_rgba(15,23,42,0.05)] backdrop-blur md:p-5">
      <div className="mb-3 flex justify-end">
        <div className="flex items-center gap-2">
          <span className="hidden w-fit rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-500 shadow-sm sm:inline-flex">
            ⌁ 가까운 순
          </span>
        </div>
      </div>

      {places.length ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-2">
          <ul className="space-y-2">
            {places.map((place) => (
              <li
                key={place.id}
                className="group rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.025)] transition hover:border-violet-100 hover:bg-violet-50/20 md:px-4 md:py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base md:h-12 md:w-12 md:text-lg ${getPlaceVisualClass(
                      place.categoryLabel,
                    )}`}
                  >
                    {getPlaceIcon(place.categoryLabel)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-950 md:text-base">{place.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500 md:gap-2 md:text-xs">
                      <span className={getPlaceInlineClass(place.categoryLabel)}>{place.categoryLabel || '장소'}</span>
                      <span className="text-slate-300">|</span>
                      <span>🚶 도보 {formatWalkingMinutes(place.distance)}</span>
                      {place.distance <= 500 ? (
                        <>
                          <span className="text-slate-300">|</span>
                          <span className="text-emerald-600">역 근처</span>
                        </>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500 md:text-sm">{place.address}</p>
                  </div>

                  <div className="hidden shrink-0 text-right text-xs font-bold text-slate-500 sm:block">
                    약 {formatDistance(place.distance)}
                  </div>

                  <a
                    href={createNaverPlaceSearchUrl(place)}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 transition hover:border-[#5A45E8]/40 hover:bg-white hover:text-[#5A45E8] active:scale-[0.98] md:px-3 md:py-2 md:text-xs"
                  >
                    지도 보기
                  </a>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-2 border-t border-slate-100 px-1 pb-1 pt-3">
            <p className="text-center text-xs font-black text-slate-400">더 많은 장소 보기</p>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
              {MORE_PLACE_LINKS.map((item) => (
                <a
                  key={item.label}
                  href={createNaverCategorySearchUrl(meetingPointName, item.label)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center text-xs font-black text-slate-500 transition hover:border-[#5A45E8]/30 hover:bg-violet-50 hover:text-[#5A45E8] active:scale-[0.98]"
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label} 더보기
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
          근처 {placeCategoryLabel} 검색 결과가 없어요.
        </p>
      )}
    </section>
  )
}

const MORE_PLACE_LINKS = [
  { label: '카페', icon: '☕' },
  { label: '맛집', icon: '🍖' },
  { label: '술집', icon: '🍺' },
  { label: '놀거리', icon: '🎮' },
]

function getPlaceIcon(categoryLabel) {
  if (categoryLabel === '카페') return '☕'
  if (categoryLabel === '밥집') return '🍖'
  if (categoryLabel === '술집') return '🍺'
  if (categoryLabel === '놀거리') return '🎮'

  return '📍'
}

function getPlaceVisualClass(categoryLabel) {
  if (categoryLabel === '카페') return 'bg-violet-50 text-[#5A45E8]'
  if (categoryLabel === '밥집') return 'bg-rose-50 text-rose-600'
  if (categoryLabel === '술집') return 'bg-emerald-50 text-emerald-600'
  if (categoryLabel === '놀거리') return 'bg-blue-50 text-blue-600'

  return 'bg-violet-50 text-[#5A45E8]'
}

function getPlaceBadgeClass(categoryLabel) {
  if (categoryLabel === '카페') return 'bg-violet-50 text-[#5A45E8]'
  if (categoryLabel === '밥집') return 'bg-rose-50 text-rose-600'
  if (categoryLabel === '술집') return 'bg-emerald-50 text-emerald-600'
  if (categoryLabel === '놀거리') return 'bg-blue-50 text-blue-600'

  return 'bg-violet-50 text-[#5A45E8]'
}

function getPlaceInlineClass(categoryLabel) {
  if (categoryLabel === '카페') return 'text-[#5A45E8]'
  if (categoryLabel === '밥집') return 'text-rose-600'
  if (categoryLabel === '술집') return 'text-emerald-600'
  if (categoryLabel === '놀거리') return 'text-blue-600'

  return 'text-[#5A45E8]'
}

function createNaverPlaceSearchUrl(place) {
  const query = encodeURIComponent(place.name)
  const center = place.lng && place.lat ? `?c=${place.lng},${place.lat},16,0,0,0,dh` : ''

  return `https://map.naver.com/p/search/${query}${center}`
}

function createNaverCategorySearchUrl(meetingPointName, categoryLabel) {
  const stationName = meetingPointName || ''
  const query = encodeURIComponent(`${stationName} ${categoryLabel}`.trim())

  return `https://map.naver.com/p/search/${query}`
}

function formatWalkingMinutes(distance) {
  const minutes = Math.max(1, Math.round(distance / 80))
  return `${minutes}분`
}

function formatDistance(distance) {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)}km`
  }

  return `${distance}m`
}

export default PlaceList
