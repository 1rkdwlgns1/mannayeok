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
        <ul className="space-y-2">
          {places.map((place) => (
            <li key={place.id} className="rounded-2xl border border-slate-100 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-[#3182F6]">
                  {getPlaceIcon(place.categoryLabel)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-950">{place.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{place.address}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {place.categoryLabel || '장소'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-slate-500">{formatDistance(place.distance)}</span>
                    <a
                      href={createKakaoPlaceSearchUrl(place)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-900 transition active:scale-[0.98]"
                    >
                      상세보기
                    </a>
                  </div>
                </div>
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
  if (categoryLabel === '음식점') return '🍽'

  return '📍'
}

function createKakaoPlaceSearchUrl(place) {
  return `https://map.kakao.com/link/search/${encodeURIComponent(place.name)}`
}

function formatDistance(distance) {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)}km`
  }

  return `${distance}m`
}

export default PlaceList
