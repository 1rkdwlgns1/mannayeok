import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import backgroundImage from '../assets/background.png'

function LoginPage({ onBack }) {
  const [notice, setNotice] = useState('')

  const handleSocialLogin = (provider) => {
    setNotice(`${provider} 로그인 기능을 준비하고 있어요.`)
  }

  return (
    <main
      className="min-h-dvh bg-[#F8FAFC] px-5 py-4 text-slate-950 md:px-6 md:py-6"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex min-h-11 items-center md:min-h-12">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#CFC5FF] hover:text-[#5D43E6] md:h-10 md:w-10"
            aria-label="메인 화면으로 돌아가기"
          >
            <ArrowLeft size={19} strokeWidth={2.2} />
          </button>

        </header>

        <section className="mx-auto mt-5 w-full max-w-[340px] md:mt-10 md:max-w-sm">
          <div>
            <p className="text-xs font-extrabold text-[#6548E8]">만나역 시작하기</p>
            <h1 className="mt-1.5 text-[26px] font-black tracking-[-0.04em] md:text-[32px]">
              반가워요!
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500 md:text-base">
              간편 로그인으로 바로 시작하세요.
            </p>
          </div>

          <div className="mt-6 space-y-2.5 md:mt-8">
            <button
              type="button"
              onClick={() => handleSocialLogin('카카오')}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-[#FEE500] px-4 text-sm font-extrabold text-[#191919] shadow-sm transition hover:brightness-[0.98] active:scale-[0.99] md:h-12 md:gap-3 md:px-5 md:text-[15px]"
            >
              <img
                src="/auth/kakao-login-symbol.png"
                alt=""
                className="h-[22px] w-[22px] shrink-0 object-contain"
                aria-hidden="true"
              />
              카카오로 시작하기
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('구글')}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] md:h-12 md:gap-3 md:px-5 md:text-[15px]"
            >
              <img
                src="/auth/google-g.png"
                alt=""
                className="h-[22px] w-[22px] shrink-0 object-contain"
                aria-hidden="true"
              />
              구글로 시작하기
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('네이버')}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-[#03A94D] px-4 text-sm font-extrabold text-white shadow-sm transition hover:brightness-[0.97] active:scale-[0.99] md:h-12 md:gap-3 md:px-5 md:text-[15px]"
            >
              <img
                src="/auth/naver-login-symbol.png"
                alt=""
                className="h-[19px] w-[19px] shrink-0 object-contain"
                aria-hidden="true"
              />
              네이버로 시작하기
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('Apple')}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-black px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-900 active:scale-[0.99] md:h-12 md:gap-3 md:px-5 md:text-[15px]"
            >
              <img
                src="/auth/apple-login-symbol.png"
                alt=""
                className="h-[22px] w-[22px] shrink-0 object-contain"
                aria-hidden="true"
              />
              Apple로 시작하기
            </button>
          </div>

          {notice && (
            <p
              className="mt-4 rounded-xl bg-[#F2EFFF] px-4 py-3 text-center text-sm font-bold text-[#6548E8]"
              role="status"
            >
              {notice}
            </p>
          )}

          <p className="mt-5 text-center text-[11px] font-medium leading-4 text-slate-600 md:mt-6 md:text-xs md:leading-5">
            계속 진행하면 만나역 이용약관 및 개인정보처리방침에 동의하게 됩니다.
          </p>

          <button
            type="button"
            onClick={onBack}
            className="mx-auto mt-3 block px-4 py-2 text-xs font-bold text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-[#6548E8] md:mt-6 md:text-sm"
          >
            로그인 없이 둘러보기
          </button>
        </section>
      </div>
    </main>
  )
}

export default LoginPage
