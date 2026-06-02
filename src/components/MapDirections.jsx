function MapDirections({ origins, station }) {
  return (
    <section id="directions" className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-[#3182F6]">어떻게 가나요?</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{station.name}까지 가는 길</h2>
        </div>
        <p className="text-xs text-slate-500">지도 앱에서 상세 경로와 환승을 확인해요.</p>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {origins.map((origin, index) => (
          <article key={`${origin.address}-${index}`} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500">출발지 {index + 1}</p>
                <p className="mt-0.5 truncate text-base font-black text-slate-950">{origin.address}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                → {station.name}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={createKakaoDirectionUrl(origin, station)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#3182F6] px-3 py-2.5 text-center text-sm font-bold text-white shadow-sm transition active:scale-[0.98]"
              >
                카카오맵
              </a>
              <a
                href={createNaverSearchUrl(origin, station)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-bold text-slate-700 transition active:scale-[0.98]"
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
  const start = createKakaoPoint(origin.address, origin.lat, origin.lng)
  const end = createKakaoPoint(station.name, station.lat, station.lng)

  return `https://map.kakao.com/link/by/traffic/${start}/${end}`
}

function createNaverSearchUrl(origin, station) {
  const start = createNaverPoint(origin.address, origin.lat, origin.lng)
  const end = createNaverPoint(station.name, station.lat, station.lng)

  return `https://map.naver.com/p/directions/${start}/${end}/-/transit`
}

function createKakaoPoint(name, lat, lng) {
  return `${encodeURIComponent(name)},${lat},${lng}`
}

function createNaverPoint(name, lat, lng) {
  return `${lng},${lat},${encodeURIComponent(name)},PLACE_POI`
}

export default MapDirections
