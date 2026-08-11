import { X } from 'lucide-react'

function UsageGuideDialog({ onClose, getMetricStatusTextClass }) {
  return (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center overflow-hidden overscroll-none bg-slate-950/35 px-4 pb-4 pt-4 backdrop-blur-[2px] md:pt-10"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-white/60 bg-white p-5 shadow-2xl md:max-h-[calc(100dvh-3.5rem)] md:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usage-guide-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-[#5A45E8]">만나역 이용안내</p>
            <h2 id="usage-guide-title" className="mt-1 text-xl font-black tracking-tight text-slate-950">
              추천 결과는 이렇게 계산해요
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="이용안내 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <section className="mt-5">
          <h3 className="text-xs font-black text-[#5A45E8]">선정 과정</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <GuideProcessStep
              number="1"
              title="후보역을 넓게 찾아요"
              description="출발지들의 중간 부근, 서로 오가는 경로 주변, 사람들이 만나기 편한 주요 역을 후보로 모아요."
            />
            <GuideProcessStep
              number="2"
              title="이동 부담을 비교해요"
              description="각 출발지에서 후보역까지의 거리와 예상 이동 부담을 비교해 한 사람에게 지나치게 치우친 역을 걸러요."
            />
            <GuideProcessStep
              number="3"
              title="만나기 좋은 조건을 더해요"
              description="카페·식당·문화시설 등 주변 선택지와 약속 장소로서의 활용도, 철도 노선 연결성을 함께 살펴봐요."
            />
            <GuideProcessStep
              number="4"
              title="목적에 따라 순위를 나눠요"
              description="실제로 만나기 좋은 종합 순위와 위치의 공평함을 더 중시한 순위를 따로 계산해 결과에 보여줘요."
            />
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-base font-black text-slate-900">결과마다 의미가 달라요</h3>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            <GuideResultType
              title="최적 추천역"
              description="위치 균형과 이동 부담뿐 아니라 상권, 약속 장소 적합성, 노선 연결성까지 종합했을 때 가장 실용적인 역이에요."
            />
            <GuideResultType
              title="위치상 가장 중간인 역"
              description="주변 상권보다 출발지 사이의 거리 차이와 지도상 중간 위치를 더 중요하게 본 참고 결과예요."
            />
            <GuideResultType
              title="다른 추천 후보 TOP3"
              description="최적 추천역 다음으로 종합 조건이 좋은 역들이에요. 원하는 분위기나 동선에 맞춰 비교해서 선택할 수 있어요."
            />
          </div>
        </section>

        <div className="mt-5">
          <p className="text-xs font-black text-[#5A45E8]">결과표 읽는 법</p>
          <h3 className="mt-1 text-base font-black text-slate-900">세부 등급은 이렇게 비교해요</h3>
        </div>
        <div className="mt-5 space-y-3">
          <GuideItem
            title="이동시간 균형"
            unit="100점 기준"
            description="최신 시간표에서 확인한 출발지별 소요시간의 차이가 작을수록 높아요. 최적 추천역과 TOP3를 같은 기준으로 비교해요."
          >
            <GuideGradeScale type="score" getMetricStatusTextClass={getMetricStatusTextClass} />
          </GuideItem>
          <GuideItem
            title="거리 균형"
            unit="100점 기준"
            description="출발지에서 후보역까지의 지도상 거리 차이가 작을수록 높아요. 위치상 가장 중간인 역을 살펴볼 때 사용하는 참고 지표예요."
          >
            <GuideGradeScale type="score" getMetricStatusTextClass={getMetricStatusTextClass} />
          </GuideItem>
          <GuideItem
            title="주변 상권"
            unit="장소 수·검색 밀도 기준"
            description="역 주변에서 확인되는 카페, 식당, 문화시설 등의 수와 검색 결과 밀도를 함께 비교해요."
          >
            <GuideGradeScale type="commercial" getMetricStatusTextClass={getMetricStatusTextClass} />
          </GuideItem>
          <GuideItem
            title="노선 접근성"
            unit="100점 기준"
            description="후보역의 이용 가능 노선, 출발지 노선과의 연결 관계, 환승 거점성을 함께 반영해요. 개인별 실제 환승 횟수가 적다는 뜻과는 달라요."
          >
            <GuideGradeScale type="score" getMetricStatusTextClass={getMetricStatusTextClass} />
          </GuideItem>
        </div>

        <p className="mt-4 break-keep text-xs leading-5 text-slate-500">
          추천 순위는 서비스 내부의 철도망과 후보 비교 기준으로 먼저 계산해요. 결과 카드의 이동시간과 환승
          경로는 추천이 끝난 뒤 공공 시간표에서 별도로 조회하므로, 시간표 결과가 추천 순위를 다시 바꾸지는
          않아요.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-xl bg-[#5A45E8] text-sm font-black text-white transition hover:bg-[#4D39D4]"
        >
          확인했어요
        </button>
      </section>
    </div>
  )
}

function GuideProcessStep({ number, title, description }) {
  return (
    <article className="flex gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#5A45E8] text-xs font-black text-white">
        {number}
      </span>
      <div>
        <h4 className="text-sm font-black text-slate-800">{title}</h4>
        <p className="mt-1 break-keep text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </article>
  )
}

function GuideResultType({ title, description }) {
  return (
    <article className="rounded-xl border border-[#E6E0FF] bg-white px-3.5 py-3.5">
      <strong className="block text-sm font-black leading-5 text-[#5A45E8]">{title}</strong>
      <p className="mt-2 break-keep text-xs leading-5 text-slate-500">{description}</p>
    </article>
  )
}

function GuideItem({ title, unit, description, children }) {
  return (
    <section className="rounded-xl border border-slate-100 bg-white px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-slate-800">{title}</h3>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500">
          {unit}
        </span>
      </div>
      <p className="mt-1.5 break-keep text-xs leading-5 text-slate-500">{description}</p>
      {children}
    </section>
  )
}

function GuideGradeScale({ type, getMetricStatusTextClass }) {
  const grades = type === 'commercial'
    ? [
        ['매우 풍부', '약 1,100곳 이상'],
        ['풍부', '약 750곳 이상'],
        ['충분', '약 450곳 이상'],
        ['보통', '약 180곳 이상'],
        ['적음', '그 미만'],
      ]
    : [
        ['매우 좋음', '85~100점'],
        ['좋음', '70~84점'],
        ['보통', '50~69점'],
        ['아쉬움', '0~49점'],
      ]

  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label="등급 기준">
      {grades.map(([label, range]) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-1.5 text-[11px] font-bold text-slate-500"
        >
          <strong className={getMetricStatusTextClass(label)}>{label}</strong>
          <span>{range}</span>
        </span>
      ))}
      {type === 'commercial' ? (
        <p className="w-full break-keep text-[11px] leading-5 text-slate-400">
          장소 수는 대표 기준이며 검색 결과 밀도가 높으면 상위 등급으로 표시될 수 있어요.
        </p>
      ) : null}
    </div>
  )
}

export default UsageGuideDialog
