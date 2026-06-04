function PlaceList({ distances, places, meetingPointName, placeCategoryLabel }) {
  if (distances) {
    return (
      <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#3182F6]">거리 비교</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">출발지별 직선거리</h2>
          </div>
          <p className="text-xs text-slate-500">실제 이동시간은 지도 앱 기준</p>
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
    <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
      <h2 className="mb-1 text-lg font-black text-slate-950">
        {meetingPointName} 근처 {placeCategoryLabel}
      </h2>
      <p className="mb-3 text-sm text-slate-500">가까운 순서로 추천 장소를 보여드려요.</p>

      {places.length ? (
        <ul className="space-y-2.5">
          {places.map((place) => (
            <li
              key={place.id}
              className="group rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.03)] transition hover:border-blue-100 hover:shadow-[0_14px_30px_rgba(49,130,246,0.09)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`relative flex h-16 w-16 shrink-0 overflow-hidden rounded-2xl ${getPlaceVisualClass(
                    place.categoryLabel,
                  )}`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.65),transparent_42%)]" />
                  <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-lg shadow-sm">
                    {getPlaceIcon(place.categoryLabel)}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                      {place.categoryLabel || '장소'}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-[#3182F6]">
                      {formatDistance(place.distance)}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-base font-black text-slate-950">{place.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{place.address}</p>
                </div>

                <a
                  href={createNaverPlaceSearchUrl(place)}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900 transition hover:border-[#3182F6] hover:text-[#3182F6] active:scale-[0.98]"
                >
                  지도보기
                </a>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
          근처 {placeCategoryLabel} 검색 결과가 없습니다.
        </p>
      )}
    </section>
  )
}

function getPlaceIcon(categoryLabel) {
  if (categoryLabel === '카페') return '☕'
  if (categoryLabel === '밥집') return '🍽'
  if (categoryLabel === '술집') return '🍺'
  if (categoryLabel === '놀거리') return '🎟'

  return '📍'
}

function getPlaceVisualClass(categoryLabel) {
  if (categoryLabel === '카페') return 'bg-gradient-to-br from-amber-50 via-orange-100 to-stone-200'
  if (categoryLabel === '밥집') return 'bg-gradient-to-br from-rose-50 via-orange-100 to-amber-200'
  if (categoryLabel === '술집') return 'bg-gradient-to-br from-indigo-100 via-violet-100 to-slate-200'
  if (categoryLabel === '놀거리') return 'bg-gradient-to-br from-blue-100 via-cyan-100 to-violet-100'

  return 'bg-gradient-to-br from-blue-50 via-slate-100 to-cyan-100'
}

function createNaverPlaceSearchUrl(place) {
  const query = encodeURIComponent(place.name)
  const center = place.lng && place.lat ? `?c=${place.lng},${place.lat},16,0,0,0,dh` : ''

  return `https://map.naver.com/p/search/${query}${center}`
}

function formatDistance(distance) {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)}km`
  }

  return `${distance}m`
}

export default PlaceList
