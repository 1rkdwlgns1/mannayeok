const providers = [
  {
    name: '카카오',
    label: '카카오 로그인',
    icon: '/auth/kakao-login-symbol.png',
    button: 'bg-[#FEE500] text-[rgba(0,0,0,0.85)]',
    iconSize: 'h-[18px] w-[18px]',
  },
  {
    name: '네이버',
    label: '네이버 로그인',
    icon: '/auth/naver-login-symbol.png',
    button: 'bg-[#03A94D] text-white',
    iconSize: 'h-4 w-4',
  },
]

function SocialLoginButtons({ onKakaoLogin, onNaverLogin }) {
  return (
    <div>
      <div className="relative my-3 flex items-center">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="px-3 text-xs font-bold text-slate-400">또는 간편 로그인</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {providers.map((provider) => (
          <button
            key={provider.name}
            type="button"
            onClick={provider.name === '카카오' ? onKakaoLogin : onNaverLogin}
            className={`flex h-10 items-center justify-center rounded-xl px-3 text-center text-[13px] font-extrabold shadow-sm transition hover:brightness-[0.98] active:scale-[0.99] sm:h-11 sm:text-sm ${provider.button}`}
            aria-label={provider.label}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <img
                src={provider.icon}
                alt=""
                className={`shrink-0 object-contain ${provider.iconSize}`}
                aria-hidden="true"
              />
              <span>{provider.label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default SocialLoginButtons
