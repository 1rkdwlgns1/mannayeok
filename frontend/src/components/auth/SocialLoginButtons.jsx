const providers = [
  {
    name: '카카오',
    label: '카카오 로그인',
    icon: '/auth/kakao-login-symbol.png',
    button: 'bg-[#FEE500] text-[rgba(0,0,0,0.85)]',
    iconSize: 'h-5 w-5',
    iconPosition: 'left-4 top-1/2 -translate-y-1/2',
  },
  {
    name: 'Google',
    label: 'Google로 로그인',
    icon: '/auth/google-g.png',
    button: 'border border-[#DADCE0] bg-white text-[#1F1F1F]',
    iconSize: 'h-5 w-5',
    iconPosition: 'left-4 top-1/2 -translate-y-1/2',
  },
  {
    name: '네이버',
    label: '네이버 로그인',
    icon: '/auth/naver-login-symbol.png',
    button: 'bg-[#03A94D] text-white',
    iconSize: 'h-[18px] w-[18px]',
    iconPosition: 'left-4 top-1/2 -translate-y-1/2',
  },
  {
    name: 'Apple',
    label: 'Apple로 로그인',
    icon: '/auth/apple-logo-black-button.png',
    button: 'bg-black text-white',
    iconSize: 'h-12 w-12',
    iconPosition: 'left-0 top-0',
  },
]

function SocialLoginButtons() {
  return (
    <div>
      <div className="relative my-4 flex items-center">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="px-3 text-xs font-bold text-slate-400">또는 간편 로그인</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {providers.map((provider) => (
          <button
            key={provider.name}
            type="button"
            className={`relative flex h-12 items-center justify-center rounded-xl px-10 text-center text-[13px] font-extrabold shadow-sm transition hover:brightness-[0.98] active:scale-[0.99] sm:text-sm ${provider.button}`}
            aria-label={provider.label}
          >
            <img
              src={provider.icon}
              alt=""
              className={`absolute object-contain ${provider.iconPosition} ${provider.iconSize}`}
              aria-hidden="true"
            />
            <span>{provider.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default SocialLoginButtons
