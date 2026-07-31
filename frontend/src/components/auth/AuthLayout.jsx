import { ArrowLeft } from 'lucide-react'
import backgroundImage from '../../assets/background.png'

function AuthLayout({ children, backTo = '/', backLabel = '메인 화면으로 돌아가기' }) {
  return (
    <main
      className="min-h-dvh bg-[#F8FAFC] px-4 py-4 text-slate-950 md:px-6 md:py-6"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(248,250,252,0.76), rgba(248,250,252,0.9)), url(${backgroundImage})`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col md:min-h-[calc(100dvh-3rem)]">
        <header className="flex min-h-10 items-center">
          <button
            type="button"
            onClick={() => window.location.assign(backTo)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#CFC5FF] hover:text-[#5D43E6] md:h-10 md:w-10"
            aria-label={backLabel}
          >
            <ArrowLeft size={19} strokeWidth={2.2} />
          </button>
        </header>

        <div className="flex flex-1 items-start justify-center py-5 md:items-center md:py-8">
          {children}
        </div>

        <footer className="flex justify-center gap-4 py-2 text-[11px] font-bold text-slate-500 md:text-xs">
          <a href="/" className="transition hover:text-[#6548E8]">만나역 홈</a>
          <span aria-hidden="true">·</span>
          <span>개인정보처리방침</span>
          <span aria-hidden="true">·</span>
          <span>이용약관</span>
        </footer>
      </div>
    </main>
  )
}

export default AuthLayout
