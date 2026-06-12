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
    <section className="rounded-3xl border border-slate-100 bg-white/95 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)] backdrop-blur md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black text-[#5A45E8]">{placeCategoryLabel}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            {meetingPointName} 근처 약속 장소
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">가까운 순서로 바로 확인할 수 있어요.</p>
        </div>
        <span className="w-fit rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500 shadow-sm">
          가까운 순
        </span>
      </div>

      {places.length ? (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
          <ul className="divide-y divide-slate-100">
            {places.map((place) => (
              <li key={place.id} className="group bg-white p-3 transition hover:bg-violet-50/30 md:p-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black md:h-20 md:w-20 ${getPlaceVisualClass(
                      place.categoryLabel,
                    )}`}
                  >
                    {getPlaceInitial(place.categoryLabel)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${getPlaceBadgeClass(place.categoryLabel)}`}>
                        {place.categoryLabel || '장소'}
                      </span>
                      <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                        도보 {formatWalkingMinutes(place.distance)}
                      </span>
                      {place.distance <= 500 ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                          역 근처
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1.5 truncate text-base font-black text-slate-950 md:text-lg">{place.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500 md:text-sm">{place.address}</p>
                  </div>

                  <div className="hidden shrink-0 text-right text-xs font-bold text-[#8A7BD8] md:block">
                    약 {formatDistance(place.distance)}
                  </div>

                  <a
                    href={createNaverPlaceSearchUrl(place)}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-[#5A45E8] hover:text-[#5A45E8] active:scale-[0.98] md:px-4 md:py-2.5"
                  >
                    지도 보기
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
          근처 {placeCategoryLabel} 검색 결과가 없어요.
        </p>
      )}
    </section>
  )
}

function getPlaceInitial(categoryLabel) {
  if (categoryLabel === '카페') return 'C'
  if (categoryLabel === '밥집') return 'F'
  if (categoryLabel === '술집') return 'B'
  if (categoryLabel === '놀거리') return 'P'

  return 'A'
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

function createNaverPlaceSearchUrl(place) {
  const query = encodeURIComponent(place.name)
  const center = place.lng && place.lat ? `?c=${place.lng},${place.lat},16,0,0,0,dh` : ''

  return `https://map.naver.com/p/search/${query}${center}`
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
