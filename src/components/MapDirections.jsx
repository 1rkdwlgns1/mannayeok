function MapDirections({ origins, station }) {
  return (
    <section id="directions" className="rounded-3xl border border-slate-100 bg-white p-3.5 shadow-sm md:p-5">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-[#3182F6]">어떻게 가나요?</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 md:text-xl">{station.name}까지 가는 길</h2>
        </div>
        <p className="text-xs text-slate-500">지도 앱에서 상세 경로와 환승을 확인해요.</p>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {origins.map((origin, index) => (
          <article key={`${origin.address}-${index}`} className="rounded-2xl bg-slate-50 p-2.5 ring-1 ring-slate-100 md:p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500">출발지 {index + 1}</p>
                <p className="mt-0.5 truncate text-sm font-black text-slate-950 md:text-base">{origin.address}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                → {station.name}
              </span>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2 md:mt-3">
              <a
                href={createKakaoDirectionUrl(origin, station)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#3182F6] px-3 py-2 text-center text-sm font-bold text-white shadow-sm transition active:scale-[0.98] md:py-2.5"
              >
                카카오맵
              </a>
              <a
                href={createNaverSearchUrl(origin, station)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold text-slate-700 transition active:scale-[0.98] md:py-2.5"
              >
                네이버지도
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function createKakaoDirectionUrl(origin, station) {
  const start = createKakaoPoint(getRoutePointName(origin), origin.lat, origin.lng)
  const end = createKakaoPoint(getRoutePointName(station), station.lat, station.lng)

  return `https://map.kakao.com/link/by/traffic/${start}/${end}`
}

function createNaverSearchUrl(origin, station) {
  const start = createNaverPoint(getRoutePointName(origin), origin.lat, origin.lng)
  const end = createNaverPoint(getRoutePointName(station), station.lat, station.lng)

  return `https://map.naver.com/p/directions/${start}/${end}/-/transit`
}

function createKakaoPoint(name, lat, lng) {
  return `${encodeURIComponent(name)},${lat},${lng}`
}

function createNaverPoint(name, lat, lng) {
  const normalizedName = normalizeRouteName(name)
  const mappedStationPoint = NAVER_STATION_ROUTE_POINTS[normalizedName]

  if (mappedStationPoint) {
    return mappedStationPoint
  }

  return `${lng},${lat},${encodeURIComponent(normalizedName)},PLACE_POI`
}

const NAVER_STATION_ROUTE_POINTS = {
  창동역: `3zkAxq,2APGJ7,${encodeURIComponent('창동역 1호선')},117,SUBWAY_STATION`,
}

function getRoutePointName(point) {
  const name = normalizeRouteName(point.routeName || point.name || point.address || '')

  if (name.includes('역') || !point.name) {
    return name
  }

  return `${name}역`
}

function normalizeRouteName(name) {
  return String(name || '')
    .replace(/\s+\d+호선/g, '')
    .trim()
}

export default MapDirections
