function TransitRoutes({ station, transitSummary, loading, error }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-[#3182F6]">어떻게 가나요?</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">{station.name}까지 가는 길</h2>
      </div>

      {loading ? <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">대중교통 경로를 찾는 중...</p> : null}

      {!loading && error ? <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-500">{error}</p> : null}

      {!loading && !error && transitSummary ? (
        <div className="space-y-3">
          {transitSummary.routes.map((route, index) => (
            <RouteCard key={`${route.originName}-${index}`} route={route} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function RouteCard({ route }) {
  if (route.error) {
    return (
      <article className="rounded-xl border border-slate-100 p-4">
        <h3 className="font-semibold text-slate-900">{route.originName} 출발</h3>
        <p className="mt-2 text-sm text-red-500">{route.error}</p>
      </article>
    )
  }

  return (
    <article className="rounded-xl border border-slate-100 p-4">
      <h3 className="font-semibold text-slate-900">{route.originName} 출발</h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {route.segments.map((segment, index) => (
          <span
            key={`${segment.name}-${index}`}
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: segment.color }}
          >
            {segment.name} {segment.time}분
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-1 text-sm text-slate-600">
        <p>환승 {route.transferCount}회</p>
        <p className="font-semibold text-slate-900">총 소요시간 {route.totalTime}분</p>
      </div>
    </article>
  )
}

export default TransitRoutes
