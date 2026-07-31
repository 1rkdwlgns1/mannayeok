import { useState } from 'react'

const providers = [
  { name: '카카오', icon: '/auth/kakao-login-symbol.png', button: 'bg-[#FEE500] text-[#191919]', iconSize: 'h-[22px] w-[22px]' },
  { name: '구글', icon: '/auth/google-g.png', button: 'border border-slate-200 bg-white text-slate-900', iconSize: 'h-[22px] w-[22px]' },
  { name: '네이버', icon: '/auth/naver-login-symbol.png', button: 'bg-[#03A94D] text-white', iconSize: 'h-[19px] w-[19px]' },
  { name: 'Apple', icon: '/auth/apple-login-symbol.png', button: 'bg-black text-white', iconSize: 'h-[22px] w-[22px]' },
]

function SocialLoginButtons() {
  const [notice, setNotice] = useState('')

  return (
    <>
      <div className="relative my-5 flex items-center">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="px-3 text-[11px] font-bold text-slate-400">또는 간편 로그인</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {providers.map((provider) => (
          <button
            key={provider.name}
            type="button"
            onClick={() => setNotice(`${provider.name} 로그인은 준비 중이에요.`)}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-extrabold shadow-sm transition hover:brightness-[0.98] active:scale-[0.99] ${provider.button}`}
          >
            <img src={provider.icon} alt="" className={`shrink-0 object-contain ${provider.iconSize}`} aria-hidden="true" />
            {provider.name}
          </button>
        ))}
      </div>
      {notice && (
        <p className="mt-3 rounded-xl bg-[#F2EFFF] px-3 py-2 text-center text-xs font-bold text-[#6548E8]" role="status">
          {notice}
        </p>
      )}
    </>
  )
}

export default SocialLoginButtons
