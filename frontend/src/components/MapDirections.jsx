import {
  createKakaoDirectionUrl,
  createNaverSearchUrl,
} from '../utils/mapDirectionUrls'

function MapDirections({ origins, station, compact = false }) {
  const directionGridClass =
    origins.length === 3 ? 'md:grid-cols-3' : origins.length >= 4 ? 'md:grid-cols-2' : 'md:grid-cols-2'

  return (
    <div
      id="directions"
      className={
        compact
          ? 'mt-3 border-t border-slate-100 pt-3'
          : 'rounded-3xl border border-slate-100 bg-white p-3.5 shadow-sm md:p-5'
      }
    >
      {!compact ? (
        <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black text-[#5A45E8]">어떻게 가나요?</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 md:text-xl">
              정확한 경로 확인
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 md:text-xs">
            지도 앱에서 실제 소요시간과 상세 환승 경로를 확인해보세요.
          </p>
        </div>
      ) : null}

      <div className={`grid gap-2 ${directionGridClass}`}>
        {origins.map((origin, index) => (
          <article
            key={`${origin.address}-${index}`}
            className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-100 md:p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-[11px] font-black ${getOriginLabelColorClass(index)}`}>
                  출발지 {String.fromCharCode(65 + index)}
                </p>
                <p className="mt-0.5 truncate text-xs font-black text-slate-950 md:text-sm">
                  {origin.routeName || origin.address}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                → {station.name}
              </span>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <a
                href={createKakaoDirectionUrl(origin, station)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-[#FEE500] bg-[#FEE500] px-3 py-2 text-center text-xs font-black text-[#191919] shadow-sm transition hover:bg-[#F6DD00] active:scale-[0.98] md:text-sm"
              >
                카카오맵
              </a>
              <a
                href={createNaverSearchUrl(origin, station)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-[#03C75A] bg-[#03C75A] px-3 py-2 text-center text-xs font-bold text-white shadow-sm transition hover:bg-[#02B351] active:scale-[0.98] md:text-sm"
              >
                네이버지도
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function getOriginLabelColorClass(originIndex) {
  if (originIndex === 1) return 'text-[#00A84D]'
  if (originIndex === 2) return 'text-yellow-600'
  if (originIndex === 3) return 'text-rose-600'
  return 'text-[#5A45E8]'
}

export default MapDirections
