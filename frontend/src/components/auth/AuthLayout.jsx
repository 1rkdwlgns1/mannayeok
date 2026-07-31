import { ArrowLeft } from 'lucide-react'
import backgroundImage from '../../assets/background.png'

function AuthLayout({
  children,
  backTo = '/',
  backLabel = '메인 화면으로 돌아가기',
  wide = false,
}) {
  const contentWidth = wide ? 'max-w-[520px]' : 'max-w-[390px]'
  const handleBack = () => {
    const hasSameOriginReferrer = document.referrer
      && new URL(document.referrer).origin === window.location.origin

    if (hasSameOriginReferrer) {
      window.history.back()
      return
    }

    window.location.assign(backTo)
  }

  return (
    <main
      className="min-h-dvh bg-[#F8FAFC] px-4 py-4 text-slate-950 md:h-dvh md:overflow-hidden md:px-6 md:py-4"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 42%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.28) 30%, transparent 58%), linear-gradient(180deg, rgba(248,250,252,0.24), rgba(248,250,252,0.48)), url(${backgroundImage})`,
        backgroundPosition: 'center, center, center bottom',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover, cover, cover',
      }}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col md:h-[calc(100dvh-2rem)] md:min-h-0">
        <header className={`mx-auto flex min-h-10 w-full items-center ${contentWidth}`}>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 shadow-sm transition hover:border-[#CFC5FF] hover:text-[#5D43E6]"
            aria-label={backLabel}
          >
            <ArrowLeft size={19} strokeWidth={2.2} />
            <span className="hidden sm:inline">이전으로</span>
          </button>
        </header>

        <div className="flex min-h-0 flex-1 items-start justify-center py-4 md:items-center md:py-2">
          {children}
        </div>

        <footer className={`mx-auto flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 py-2 text-[10px] font-bold text-slate-500 md:text-[11px] ${contentWidth}`}>
          <a href="/" className="whitespace-nowrap transition hover:text-[#6548E8]">© 2026 만나역</a>
          <a href="/#terms" className="whitespace-nowrap transition hover:text-[#6548E8]">서비스 이용안내</a>
          <a href="/#privacy" className="whitespace-nowrap transition hover:text-[#6548E8]">개인정보처리방침</a>
          <a href="/#sources" className="whitespace-nowrap transition hover:text-[#6548E8]">데이터 출처</a>
          <a href="/#inquiry" className="whitespace-nowrap transition hover:text-[#6548E8]">문의하기</a>
        </footer>
      </div>
    </main>
  )
}

export default AuthLayout
