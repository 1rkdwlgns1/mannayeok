import { motion } from 'framer-motion'
import backgroundImage from '../assets/background.png'
import logoImage from '../assets/rogo.png'

const TRUST_ITEMS = [
  {
    icon: '/phosphor-icons/subway-fill.svg',
    label: '이동 부담 최소화',
    text: '위치와 이동 부담을 함께 고려한 장소 추천',
  },
  {
    icon: '/phosphor-icons/storefront-fill.svg',
    label: '주변 상권 분석',
    text: '카페, 식당 등 편의시설까지 고려',
  },
  {
    icon: '/phosphor-icons/users-three-fill.svg',
    label: '실제 만나기 좋은 곳',
    text: '약속하기 좋은 장소만 추천',
  },
]

const REASON_CHIPS = ['위치 균형 우수', '상권 풍부', '환승 편리']
const BRAND_PURPLE = '#5A45E8'
const EASE_OUT = [0.22, 1, 0.36, 1]

const fadeIn = (delay = 0, duration = 0.5) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { delay, duration, ease: EASE_OUT },
})

const riseIn = (delay = 0, duration = 0.55) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration, ease: EASE_OUT },
})

function TrophyIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 256 256" className={className} fill="currentColor" focusable="false" aria-hidden="true">
      <path d="M232 64h-24V48a8 8 0 0 0-8-8H56a8 8 0 0 0-8 8v16H24A16 16 0 0 0 8 80v16a40 40 0 0 0 40 40h3.65A80.13 80.13 0 0 0 120 191.61V216H96a8 8 0 0 0 0 16h64a8 8 0 0 0 0-16h-24v-24.42c31.94-3.23 58.44-25.64 68.08-55.58H208a40 40 0 0 0 40-40V80a16 16 0 0 0-16-16ZM48 120a24 24 0 0 1-24-24V80h24v32q0 4 .39 8ZM232 96a24 24 0 0 1-24 24h-.5a81.81 81.81 0 0 0 .5-8.9V80h24Z" />
    </svg>
  )
}

function OnboardingScreen({ onStart, isLeaving = false }) {
  return (
    <main
      className={`onboarding-screen min-h-screen overflow-hidden bg-[#F8FAFC] text-slate-950 ${
        isLeaving ? 'is-leaving' : ''
      }`}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(248,250,252,0.80) 0%, rgba(248,250,252,0.54) 50%, rgba(248,250,252,0.86) 100%), url(${backgroundImage})`,
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 md:px-8 md:py-7">
        <header className="mx-auto flex w-full max-w-4xl items-center justify-start md:justify-between">
          <motion.div {...fadeIn(0, 0.5)}>
            <LogoMark
              className="h-16 w-44 overflow-visible md:h-20 md:w-72"
              imageClassName="origin-left -translate-x-7 translate-y-1 scale-[1.6] md:-translate-x-11 md:translate-y-1.5 md:scale-[2.15]"
            />
          </motion.div>
          <motion.div className="hidden md:mt-4 md:block" {...fadeIn(0.1, 0.5)}>
            <BetaBadge />
          </motion.div>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-4 pb-4 pt-2 text-center md:gap-5 md:pb-5 md:pt-2">
          <motion.div className="max-w-3xl" {...riseIn(0.4, 0.55)}>
            <p className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-[#5A45E8] shadow-sm ring-1 ring-violet-100 md:gap-2 md:px-4 md:py-2 md:text-sm">
              <MaskedIcon src="/phosphor-icons/subway-fill.svg" className="h-4 w-4" />
              약속 장소 추천 서비스
            </p>

            <h1 className="mt-3 text-[30px] font-black leading-tight tracking-tight text-slate-950 md:mt-5 md:text-5xl lg:text-[58px]">
              여기서 만나, <span className="text-[#5A45E8]">역!</span>
              <span className="mt-1 block text-[23px] md:mt-0 md:text-4xl lg:text-[44px]">
                약속 장소 고민, <span className="text-[#5A45E8]">3초 만에 끝.</span>
              </span>
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-6 text-slate-600 md:mt-4 md:text-lg md:leading-7">
              출발지만 입력하면 모두가 부담 적은 만나기 좋은 약속 장소를 추천해드려요.
            </p>
            <p className="mx-auto mt-1.5 text-[11px] font-bold text-slate-400 md:mt-2 md:text-xs">
              현재 베타 서비스는 수도권 전철망 이용 지역을 지원합니다.
            </p>

            <motion.button
              type="button"
              onClick={onStart}
              disabled={isLeaving}
              className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#5A45E8] px-6 text-sm font-black text-white opacity-0 shadow-[0_14px_34px_rgba(90,69,232,0.30)] transition hover:-translate-y-0.5 hover:bg-[#4938D1] active:translate-y-0 disabled:cursor-wait disabled:bg-violet-300 md:mt-6 md:min-h-14 md:px-7 md:text-base"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: [0, -4, 0],
              }}
              transition={{
                opacity: { delay: 1.4, duration: 0.4, ease: EASE_OUT },
                scale: { delay: 1.4, duration: 0.4, ease: EASE_OUT },
                y: { delay: 2, duration: 1.7, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' },
              }}
            >
              약속 장소 찾기
              <img src="/phosphor-icons/arrow-right.svg" alt="" className="h-4 w-4 invert" />
            </motion.button>
          </motion.div>

          <div className="relative w-full max-w-4xl">
            <div className="mx-auto max-w-3xl">
              <div className="grid grid-cols-[minmax(0,0.9fr)_auto_minmax(0,0.9fr)] items-center gap-2 md:gap-4">
                <motion.div
                  initial={{ opacity: 0, x: -26 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8, duration: 0.55, ease: EASE_OUT }}
                >
                  <StationPill label="청량리" />
                </motion.div>

                <motion.div
                  className="flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4, duration: 0.42, ease: EASE_OUT }}
                >
                  <span className="hidden h-0.5 w-20 border-t-2 border-dashed border-violet-300 md:block" />
                  <span className="mx-1 text-3xl font-black leading-none text-[#5A45E8]">↓</span>
                  <span className="hidden h-0.5 w-20 border-t-2 border-dashed border-violet-300 md:block" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 26 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1, duration: 0.55, ease: EASE_OUT }}
                >
                  <StationPill label="서울역" />
                </motion.div>
              </div>

              <motion.div
                className="mx-auto mt-3 w-full max-w-xl rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-[0_20px_55px_rgba(15,23,42,0.14)] md:mt-4 md:rounded-3xl md:p-6"
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.8, duration: 0.6, ease: EASE_OUT }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5A45E8] px-3 py-1.5 text-xs font-black text-white shadow-sm">
                      <TrophyIcon className="h-3.5 w-3.5" />
                      추천 약속역
                    </span>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:mt-4 md:text-4xl">
                      종로 3가역
                    </h2>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 md:mt-4 md:gap-2">
                  {REASON_CHIPS.map((label, index) => (
                    <ReasonChip key={label} label={label} delay={2.3 + index * 0.1} />
                  ))}
                </div>
              </motion.div>

              <div className="mt-3 grid w-full grid-cols-3 items-stretch gap-2 md:mt-4 md:gap-3">
                {TRUST_ITEMS.map((item, index) => (
                  <motion.div
                    key={item.label}
                    className="flex min-h-20 items-center justify-center rounded-2xl border border-slate-100 bg-white/92 p-2 text-center shadow-sm backdrop-blur md:min-h-24 md:justify-start md:p-3 md:text-left"
                    initial={{ opacity: 0, x: -12, y: 8 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ delay: 2.7 + index * 0.15, duration: 0.45, ease: EASE_OUT }}
                  >
                    <div className="flex w-full flex-col items-center gap-2 md:flex-row md:gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 md:h-11 md:w-11">
                        <MaskedIcon src={item.icon} className="h-4.5 w-4.5 md:h-5 md:w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-[11px] font-black leading-4 text-slate-950 md:text-sm">{item.label}</h3>
                        <p className="mt-1 hidden text-sm font-bold leading-5 text-slate-500 md:block">{item.text}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

        </section>
      </div>
    </main>
  )
}

function LogoMark({ className, imageClassName = '' }) {
  return (
    <span className={`relative block ${className}`} aria-label="만나역" role="img">
      <img src={logoImage} alt="" className={`h-full w-full object-contain object-left ${imageClassName}`} />
    </span>
  )
}

function BetaBadge() {
  return (
    <span
      className="inline-flex items-center rounded-xl border border-violet-200 bg-white/95 px-2.5 py-1 text-[11px] font-black tracking-wide text-[#5A45E8] shadow-sm ring-1 ring-violet-50"
      aria-label="베타 서비스"
    >
      BETA
    </span>
  )
}

function StationPill({ label }) {
  return (
    <div className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 text-sm font-black text-slate-950 shadow-sm md:min-h-12 md:text-base">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5A45E8] md:h-7 md:w-7">
        <img src="/phosphor-icons/subway-fill.svg" alt="" className="h-3 w-3 brightness-0 invert md:h-3.5 md:w-3.5" />
      </span>
      {label}
    </div>
  )
}

function MaskedIcon({ src, className = '' }) {
  return (
    <span
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
      style={{
        backgroundColor: BRAND_PURPLE,
        maskImage: `url(${src})`,
        maskPosition: 'center',
        maskRepeat: 'no-repeat',
        maskSize: 'contain',
        WebkitMaskImage: `url(${src})`,
        WebkitMaskPosition: 'center',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
      }}
    />
  )
}

function ReasonChip({ label, delay }) {
  return (
    <motion.span
      className="rounded-xl border border-violet-100 bg-white px-3 py-1.5 text-xs font-black text-[#5A45E8] shadow-sm md:text-sm"
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.35, ease: EASE_OUT }}
    >
      {label}
    </motion.span>
  )
}

export default OnboardingScreen
