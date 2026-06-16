import { motion } from 'framer-motion'
import backgroundImage from '../assets/background.png'
import logoImage from '../assets/rogo.png'

const TRUST_ITEMS = [
  {
    icon: '/phosphor-icons/subway-fill.svg',
    label: '이동 부담 최소화',
    text: '모두에게 공평한 거리의 장소 추천',
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

const REASON_CHIPS = ['거리 균형 우수', '상권 좋음', '환승 편리']
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
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 md:px-8 md:py-7">
        <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <motion.div {...fadeIn(0, 0.5)}>
            <LogoMark
              className="h-16 w-64 overflow-visible md:h-20 md:w-72"
              imageClassName="origin-left -translate-x-10 translate-y-1 scale-[1.95] md:-translate-x-11 md:translate-y-1.5 md:scale-[2.15]"
            />
          </motion.div>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-6 pb-5 pt-5 text-center md:gap-7 md:pt-2">
          <motion.div className="max-w-3xl" {...riseIn(0.4, 0.55)}>
            <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-black text-[#5A45E8] shadow-sm ring-1 ring-violet-100">
              <MaskedIcon src="/phosphor-icons/subway-fill.svg" className="h-4 w-4" />
              약속 장소 추천 서비스
            </p>

            <h1 className="mt-5 text-[36px] font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-[58px]">
              여기서 만나, <span className="text-[#5A45E8]">역!</span>
              <span className="block text-[28px] sm:text-4xl lg:text-[44px]">
                약속 장소 고민, <span className="text-[#5A45E8]">3초 만에 끝.</span>
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base font-bold leading-7 text-slate-600 sm:text-lg">
              출발지만 입력하면 모두가 부담 적은 만나기 좋은 약속 장소를 추천해드려요.
            </p>

            <motion.button
              type="button"
              onClick={onStart}
              disabled={isLeaving}
              className="mt-6 inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#5A45E8] px-7 text-base font-black text-white opacity-0 shadow-[0_14px_34px_rgba(90,69,232,0.30)] transition hover:-translate-y-0.5 hover:bg-[#4938D1] active:translate-y-0 disabled:cursor-wait disabled:bg-violet-300 sm:min-h-14"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: [0, -4, 0],
              }}
              transition={{
                opacity: { delay: 3.4, duration: 0.4, ease: EASE_OUT },
                scale: { delay: 3.4, duration: 0.4, ease: EASE_OUT },
                y: { delay: 3.9, duration: 1.7, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' },
              }}
            >
              약속 장소 찾기
              <img src="/phosphor-icons/arrow-right.svg" alt="" className="h-4 w-4 invert" />
            </motion.button>
          </motion.div>

          <div className="relative w-full max-w-4xl">
            <div className="mx-auto">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-4">
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
                className="mx-auto mt-4 w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-[0_20px_55px_rgba(15,23,42,0.14)] md:p-6"
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.8, duration: 0.6, ease: EASE_OUT }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5A45E8] px-3 py-1.5 text-xs font-black text-white shadow-sm">
                      <img src="/phosphor-icons/trophy-fill.svg" alt="" className="h-3.5 w-3.5 brightness-0 invert" />
                      추천 약속역
                    </span>
                    <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                      왕십리역
                    </h2>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-violet-50 px-3 py-2 text-right">
                    <p className="text-[11px] font-black text-[#8A7BD8]">만남 적합도</p>
                    <p className="mt-1 text-3xl font-black leading-none text-[#5A45E8]">
                      91<span className="ml-1 text-sm font-black text-[#8A7BD8]">점</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {REASON_CHIPS.map((label, index) => (
                    <ReasonChip key={label} label={label} delay={2.3 + index * 0.1} />
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          <div className="grid w-full max-w-4xl gap-3 md:grid-cols-3">
            {TRUST_ITEMS.map((item, index) => (
              <motion.div
                key={item.label}
                className="rounded-2xl border border-slate-100 bg-white/92 p-4 text-left shadow-sm backdrop-blur"
                initial={{ opacity: 0, x: -12, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 2.7 + index * 0.15, duration: 0.45, ease: EASE_OUT }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-50">
                    <MaskedIcon src={item.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-950">{item.label}</h3>
                    <p className="mt-1 text-xs font-bold leading-5 text-slate-500 md:text-sm">{item.text}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </section>
      </div>
    </main>
  )
}

function LogoMark({ className, imageClassName = '' }) {
  return (
    <span className={`block ${className}`} aria-label="만나역" role="img">
      <img src={logoImage} alt="" className={`h-full w-full object-contain object-left ${imageClassName}`} />
    </span>
  )
}

function StationPill({ label }) {
  return (
    <div className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 text-sm font-black text-slate-950 shadow-sm md:min-h-14 md:text-base">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#5A45E8]">
        <img src="/phosphor-icons/subway-fill.svg" alt="" className="h-3.5 w-3.5 brightness-0 invert" />
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
