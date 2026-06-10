const TEXT = {
  badge: '약속역 추천',
  cta: '지금 시작하기',
  featureBalance: '거리 균형',
  featureBalanceText: '모두의 이동 거리가 비슷한 역 추천',
  featureCommercial: '주변 상권',
  featureCommercialText: '카페, 식당, 놀거리가 많은 역 추천',
  featureTransit: '노선 접근성',
  featureTransitText: '환승과 이동이 편한 역 추천',
  headline: '어디서 만날지 고민 끝,',
  headlineAccent: '만나기 좋은 역을 찾아드려요',
  helper: '출발지를 입력하고 바로 계산할 수 있어요.',
  line2: '2호선',
  line5: '5호선',
  lineGyeongui: '경의중앙',
  previewDescription: '출발지 간 이동 부담이 비슷하고, 주변 장소와 노선 접근성이 함께 좋은 후보입니다.',
  previewKicker: '최적 추천역',
  previewReasonTitle: '추천 이유',
  previewScoreLabel: '만남 적합도',
  previewStation: '?? 역',
  scoreUnit: '점',
  serviceTag: '서비스 소개',
  subcopy: '거리 균형, 주변 상권, 노선 접근성까지 고려해 모두에게 부담 적은 약속역을 추천해드려요.',
}

const FEATURE_ITEMS = [
  {
    icon: '/phosphor-icons/users-three-fill.svg',
    iconFilter: 'invert(35%) sepia(90%) saturate(1798%) hue-rotate(220deg) brightness(97%) contrast(96%)',
    label: TEXT.featureBalance,
    text: TEXT.featureBalanceText,
    tone: 'bg-sky-50 text-sky-700',
  },
  {
    icon: '/phosphor-icons/storefront-fill.svg',
    iconFilter: 'invert(36%) sepia(88%) saturate(1784%) hue-rotate(234deg) brightness(94%) contrast(95%)',
    label: TEXT.featureCommercial,
    text: TEXT.featureCommercialText,
    tone: 'bg-violet-50 text-[#5A45E8]',
  },
  {
    icon: '/phosphor-icons/subway-fill.svg',
    iconFilter: 'invert(49%) sepia(88%) saturate(472%) hue-rotate(105deg) brightness(91%) contrast(88%)',
    label: TEXT.featureTransit,
    text: TEXT.featureTransitText,
    tone: 'bg-emerald-50 text-emerald-700',
  },
]

const PREVIEW_REASONS = ['이동 부담이 비슷해요', '근처 장소가 충분해요', '환승 흐름이 편해요']

function OnboardingScreen({ onStart, isLeaving = false }) {
  return (
    <main
      className={`onboarding-screen min-h-screen overflow-hidden bg-[#F8FAFC] px-3 py-4 text-slate-950 md:px-6 md:py-8 ${
        isLeaving ? 'is-leaving' : ''
      }`}
    >
      <div className="mx-auto flex min-h-[calc(100vh-32px)] w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#5A45E8] shadow-[0_10px_24px_rgba(90,69,232,0.24)]">
              <span className="text-sm font-black text-white">M</span>
            </div>
            <span className="text-lg font-black tracking-tight">MeetMiddle</span>
          </div>
          <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-black text-[#5A45E8] shadow-sm ring-1 ring-violet-100 sm:inline-flex">
            {TEXT.serviceTag}
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center gap-8 py-8 md:py-10">
          <div className="grid items-center gap-7 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="max-w-xl">
              <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-[#5A45E8] shadow-sm ring-1 ring-violet-100">
                {TEXT.badge}
              </p>
              <h1 className="mt-5 text-[34px] font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-[54px]">
                {TEXT.headline}
                <span className="block text-[#5A45E8]">{TEXT.headlineAccent}</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">{TEXT.subcopy}</p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={onStart}
                  disabled={isLeaving}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#5A45E8] px-6 text-base font-black text-white shadow-[0_12px_28px_rgba(90,69,232,0.28)] transition hover:-translate-y-0.5 hover:bg-[#4938D1] active:translate-y-0 disabled:cursor-wait disabled:bg-violet-300"
                >
                  {TEXT.cta}
                  <img src="/phosphor-icons/arrow-right.svg" alt="" className="h-4 w-4 invert" />
                </button>
                <p className="text-sm font-bold leading-6 text-slate-500">{TEXT.helper}</p>
              </div>
            </div>

            <div className="hero-preview-card rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5A45E8] px-3 py-1.5 text-xs font-black text-white shadow-sm">
                    <img
                      src="/phosphor-icons/trophy-fill.svg"
                      alt=""
                      className="h-3.5 w-3.5 brightness-0 invert"
                    />
                    {TEXT.previewKicker}
                  </span>
                  <h2 className="mt-4 text-[30px] font-black tracking-tight text-slate-950 md:text-4xl">
                    {TEXT.previewStation}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <LineChip label={TEXT.line2} tone="border-emerald-200 bg-emerald-50 text-[#4DA463]" />
                    <LineChip label={TEXT.line5} tone="border-violet-200 bg-violet-50 text-[#8A4FF5]" />
                    <LineChip label={TEXT.lineGyeongui} tone="border-slate-200 bg-slate-50 text-slate-600" />
                  </div>
                </div>

                <div className="shrink-0 rounded-2xl bg-violet-50 px-3 py-2 text-right">
                  <p className="text-[11px] font-black text-[#8A7BD8]">{TEXT.previewScoreLabel}</p>
                  <p className="mt-1 text-3xl font-black leading-none text-[#5A45E8]">
                    91<span className="ml-1 text-sm font-black text-[#8A7BD8]">{TEXT.scoreUnit}</span>
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">{TEXT.previewDescription}</p>

              <div className="mt-4 rounded-xl bg-slate-50/80 px-3 py-3">
                <p className="text-[11px] font-black text-slate-400">{TEXT.previewReasonTitle}</p>
                <ul className="mt-2 space-y-1.5">
                  {PREVIEW_REASONS.map((reason) => (
                    <li key={reason} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-black text-emerald-600">
                        ✓
                      </span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {FEATURE_ITEMS.map((item) => (
              <div key={item.label} className="hero-feature-card rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
                    <img src={item.icon} alt="" className="h-4 w-4" style={{ filter: item.iconFilter }} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-950">{item.label}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function LineChip({ label, tone }) {
  return <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${tone}`}>{label}</span>
}

export default OnboardingScreen
