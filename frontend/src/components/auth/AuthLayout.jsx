import { ArrowLeft } from 'lucide-react'
import backgroundImage from '../../assets/background.webp'

function AuthLayout({
  children,
  backTo = '/',
  backLabel = '메인 화면으로 돌아가기',
  backText = '이전으로',
  onBack,
  wide = false,
  dashboard = false,
  compactFooter = false,
  topAligned = false,
}) {
  const contentWidth = dashboard ? 'max-w-[980px]' : wide ? 'max-w-[520px]' : 'max-w-[390px]'
  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    window.location.assign(backTo)
  }

  return (
    <main
      className="min-h-dvh bg-[#F8FAFC] px-3 py-3 text-slate-950 sm:px-4 sm:py-4 md:px-6 md:py-4"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 42%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.28) 30%, transparent 58%), linear-gradient(180deg, rgba(248,250,252,0.24), rgba(248,250,252,0.48)), url(${backgroundImage})`,
        backgroundPosition: 'center, center, center bottom',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover, cover, cover',
      }}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col sm:min-h-[calc(100dvh-2rem)]">
        <div className={`flex min-h-0 flex-1 flex-col ${topAligned ? 'justify-start pb-1 pt-1 sm:pb-2 sm:pt-2' : 'justify-center py-2 sm:py-3'}`}>
          <header className={`mx-auto mb-2 flex w-full shrink-0 items-center ${contentWidth}`}>
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 shadow-sm transition hover:border-[#CFC5FF] hover:text-[#5D43E6]"
              aria-label={backLabel}
            >
              <ArrowLeft size={18} strokeWidth={2.2} />
              <span>{backText}</span>
            </button>
          </header>

          <div className="flex w-full shrink-0 justify-center">
            {children}
          </div>
        </div>

        <footer className={`mx-auto flex w-full shrink-0 flex-col items-center gap-1.5 border-t border-slate-200/80 pb-2 pt-3 text-center text-[10px] font-bold text-slate-500 md:pt-4 md:text-[11px] ${contentWidth}`}>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
            <a href="/" className="whitespace-nowrap transition hover:text-[#6548E8]">© 2026 만나역</a>
            {!compactFooter && (
              <a href="/#terms" className="whitespace-nowrap transition hover:text-[#6548E8]">서비스 이용안내</a>
            )}
            <a href="/privacy" className="whitespace-nowrap transition hover:text-[#6548E8]">개인정보처리방침</a>
            {!compactFooter && (
              <a href="/#sources" className="whitespace-nowrap transition hover:text-[#6548E8]">데이터 출처</a>
            )}
            <a href="mailto:mannayeok.help@gmail.com" className="whitespace-nowrap transition hover:text-[#6548E8]">문의하기</a>
          </div>
          <p className="font-medium text-slate-400">
            운영 문의: mannayeok.help@gmail.com
          </p>
        </footer>
      </div>
    </main>
  )
}

export default AuthLayout
