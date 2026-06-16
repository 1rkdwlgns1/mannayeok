function PlaceList({ distances, places, meetingPointName, placeCategoryLabel }) {
  if (distances) {
    return (
      <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[#5A45E8]">거리 비교</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 md:text-xl">출발지별 직선거리</h2>
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
    <section className="rounded-3xl border border-slate-100 bg-white/95 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)] backdrop-blur md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-black text-slate-950 md:text-base">
          {placeCategoryLabel} <span className="text-[#5A45E8]">{places.length}곳</span>
        </h2>
        <span className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-500 shadow-sm md:text-xs">
          가까운 순
        </span>
      </div>

      {places.length ? (
        <div className="rounded-2xl border border-slate-100 bg-white px-3 md:px-4">
          <ul className="divide-y divide-slate-100">
            {places.map((place) => (
              <li
                key={place.id}
                className="group py-3.5 transition md:py-4"
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-black text-slate-950 md:text-base">{place.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 md:text-[13px]">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5">도보 {formatWalkingMinutes(place.distance)}</span>
                      <span className="text-slate-300">·</span>
                      <span>{formatDistance(place.distance)}</span>
                      {place.distance <= 500 ? (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-emerald-600">역 근처</span>
                        </>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500 md:text-[13px]">{place.address}</p>
                  </div>

                  <a
                    href={createNaverPlaceSearchUrl(place)}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500 transition hover:border-[#5A45E8]/40 hover:text-[#5A45E8] active:scale-[0.98] md:px-3.5 md:text-[13px]"
                  >
                    지도 보기
                  </a>
                  <span className="hidden text-lg font-black text-slate-300 md:block">›</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-slate-100 px-1 pb-3 pt-4">
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
  { label: '카페' },
  { label: '맛집' },
  { label: '술집' },
  { label: '놀거리' },
]

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
