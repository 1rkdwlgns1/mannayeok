import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { exchangeKakaoLogin, exchangeNaverLogin, getKakaoLoginUrl, getNaverLoginUrl, login } from '../../services/authApi'
import { saveAuth } from '../../services/authStorage'
import AuthCard from './AuthCard'
import AuthField from './AuthField'
import AuthLayout from './AuthLayout'
import SocialLoginButtons from './SocialLoginButtons'
import AnimatedLoadingDots from '../AnimatedLoadingDots'
import { consumeAuthReturnPath } from '../../services/authReturn'

function LoginPage() {
  const searchParams = new URLSearchParams(window.location.search)
  const oauthTicket = searchParams.get('oauthTicket')
  const oauthError = searchParams.get('oauthError')
  const oauthProvider = searchParams.get('provider')
  const signupComplete = searchParams.get('signup') === 'complete'
  const passwordResetComplete = searchParams.get('passwordReset') === 'complete'
  const passwordChangedComplete = searchParams.get('passwordChanged') === 'complete'
  const [form, setForm] = useState({ email: '', password: '', remember: true })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(Boolean(oauthTicket))
  const [passwordVisible, setPasswordVisible] = useState(false)
  const oauthStarted = useRef(false)

  useEffect(() => {
    if (!oauthTicket || oauthStarted.current) return
    oauthStarted.current = true
    const exchangeLogin = oauthProvider === 'naver' ? exchangeNaverLogin : exchangeKakaoLogin
    exchangeLogin(oauthTicket)
      .then((auth) => {
        saveAuth(auth, true)
        window.location.replace(consumeAuthReturnPath())
      })
      .catch((requestError) => {
        setError(requestError.message)
        setSubmitting(false)
        window.history.replaceState({}, '', '/login')
      })
  }, [oauthProvider, oauthTicket])

  const oauthErrorMessage = {
    KAKAO_LOGIN_CANCELLED: '카카오 로그인이 취소됐어요.',
    INVALID_OAUTH_STATE: '로그인 요청을 확인하지 못했어요. 다시 시도해 주세요.',
    KAKAO_EMAIL_REQUIRED: '카카오 계정에서 이메일 제공에 동의해 주세요.',
    SOCIAL_EMAIL_ALREADY_EXISTS: '같은 이메일로 가입된 계정이 있어요. 이메일로 로그인해 주세요.',
    KAKAO_LOGIN_FAILED: '카카오 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.',
    NAVER_LOGIN_CANCELLED: '네이버 로그인이 취소됐어요.',
    NAVER_EMAIL_REQUIRED: '네이버 계정에서 이메일 제공에 동의해 주세요.',
    NAVER_LOGIN_FAILED: '네이버 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.',
    NAVER_LOGIN_NOT_CONFIGURED: '네이버 로그인이 아직 설정되지 않았어요.',
  }[oauthError]

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const auth = await login({ email: form.email.trim(), password: form.password })
      saveAuth(auth, form.remember)
      window.location.replace(consumeAuthReturnPath())
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout wide compactFooter backText="홈으로">
      <AuthCard
        wide
        centered
        title="로그인"
        titleClassName="text-[#6548E8]"
        description="이메일로 로그인하고 만나역을 이용해 보세요."
      >
        {signupComplete && (
          <p className="mt-5 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs font-bold text-emerald-700 sm:text-sm" role="status">
            회원가입이 완료됐어요. 로그인해 주세요.
          </p>
        )}
        {passwordResetComplete && (
          <p className="mt-5 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs font-bold text-emerald-700 sm:text-sm" role="status">
            비밀번호가 변경됐어요. 새 비밀번호로 로그인해 주세요.
          </p>
        )}
        {passwordChangedComplete && (
          <p className="mt-5 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs font-bold text-emerald-700 sm:text-sm" role="status">
            비밀번호가 변경됐어요. 새 비밀번호로 로그인해 주세요.
          </p>
        )}
        {oauthErrorMessage && (
          <p className="mt-5 rounded-xl bg-red-50 px-3.5 py-3 text-xs font-bold text-red-700 sm:text-sm" role="alert">
            {oauthErrorMessage}
          </p>
        )}
        <form className="mt-4 space-y-3 text-left" onSubmit={handleSubmit} noValidate>
          <AuthField dense label="이메일" icon={Mail} type="email" name="email" value={form.email} onChange={handleChange} placeholder="이메일 주소를 입력해 주세요" autoComplete="email" required />
          <AuthField
            dense
            label="비밀번호"
            icon={LockKeyhole}
            type={passwordVisible ? 'text' : 'password'}
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="비밀번호를 입력해 주세요"
            autoComplete="current-password"
            required
            trailing={(
              <button
                type="button"
                onClick={() => setPasswordVisible((visible) => !visible)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-[#6548E8]"
                aria-label={passwordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          />
          {error && <p className="text-xs font-bold text-red-600" role="alert">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" name="remember" checked={form.remember} onChange={handleChange} className="h-4 w-4 accent-[#6548E8]" />
              로그인 상태 유지
            </label>
            <a href="/forgot-password" className="text-xs font-extrabold text-[#6548E8] hover:underline">비밀번호 찾기</a>
          </div>
          <button type="submit" disabled={submitting} className="h-10 w-full rounded-xl bg-[#6548E8] text-sm font-black text-white shadow-sm transition hover:bg-[#5639DC] disabled:cursor-wait disabled:opacity-60 sm:h-11 sm:text-[15px]">
            {submitting ? <>로그인 중<AnimatedLoadingDots /></> : '로그인'}
          </button>
        </form>
        <p className="mt-3 text-center text-[13px] font-medium text-slate-600 sm:text-sm">
          아직 회원이 아니신가요? <a href="/signup" className="font-black text-[#6548E8] hover:underline">회원가입</a>
        </p>
        <SocialLoginButtons
          onKakaoLogin={() => window.location.assign(getKakaoLoginUrl())}
          onNaverLogin={() => window.location.assign(getNaverLoginUrl())}
        />
        <p className="mt-3 text-center text-[11px] font-semibold leading-5 text-slate-600 md:text-xs">
          계속 진행하면 만나역{' '}
          <a href="/terms" target="_blank" rel="noreferrer" className="font-extrabold text-[#6548E8] hover:underline">이용약관</a>
          {' '}및{' '}
          <a href="/privacy" target="_blank" rel="noreferrer" className="font-extrabold text-[#6548E8] hover:underline">개인정보처리방침</a>
          에 동의하게 됩니다.
        </p>
      </AuthCard>
    </AuthLayout>
  )
}

export default LoginPage
