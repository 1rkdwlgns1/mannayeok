import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import AuthCard from './AuthCard.jsx'
import AuthField from './AuthField.jsx'
import AuthLayout from './AuthLayout.jsx'
import { linkKakaoAccount, linkNaverAccount, signupWithKakao, signupWithNaver } from '../../services/authApi.js'
import { saveAuth } from '../../services/authStorage.js'
import AnimatedLoadingDots from '../AnimatedLoadingDots.jsx'
import { consumeAuthReturnPath } from '../../services/authReturn.js'

function SocialSignupPage() {
  const searchParams = new URLSearchParams(window.location.search)
  const ticket = searchParams.get('oauthTicket')
  const provider = searchParams.get('provider') === 'naver' ? 'naver' : 'kakao'
  const linkMode = searchParams.get('mode') === 'link'
  const providerName = provider === 'naver' ? '네이버' : '카카오'
  const [consents, setConsents] = useState({
    termsAccepted: false,
    privacyAccepted: false,
    ageConfirmed: false,
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const allAccepted = Object.values(consents).every(Boolean)

  if (!ticket) {
    window.location.replace('/login')
    return null
  }

  const setAll = (checked) => setConsents({
    termsAccepted: checked,
    privacyAccepted: checked,
    ageConfirmed: checked,
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!allAccepted || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const signupSocial = provider === 'naver' ? signupWithNaver : signupWithKakao
      const auth = await signupSocial({ ticket, ...consents })
      saveAuth(auth, true)
      window.location.replace(consumeAuthReturnPath())
    } catch (requestError) {
      setError(requestError.message)
      setSubmitting(false)
    }
  }

  const handleLink = async (event) => {
    event.preventDefault()
    if (!currentPassword || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const linkSocialAccount = provider === 'naver' ? linkNaverAccount : linkKakaoAccount
      const auth = await linkSocialAccount({ ticket, currentPassword })
      saveAuth(auth, true)
      window.location.replace(consumeAuthReturnPath(`/account?socialLinked=${provider}`))
    } catch (requestError) {
      const message = requestError.code === 'CURRENT_PASSWORD_MISMATCH'
        ? '현재 비밀번호가 일치하지 않아요.'
        : requestError.message
      setError(message)
      setSubmitting(false)
    }
  }

  if (linkMode) {
    return (
      <AuthLayout backTo="/login" wide compactFooter>
        <AuthCard
          eyebrow={`${providerName} 계정 연결`}
          title="기존 계정과 연결할게요"
          description="같은 이메일로 가입된 만나역 계정의 비밀번호를 확인해 주세요."
          wide
          centered
        >
          <form className="mt-4 text-left" onSubmit={handleLink} noValidate>
            <AuthField
              dense
              label="현재 비밀번호"
              icon={LockKeyhole}
              type={passwordVisible ? 'text' : 'password'}
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value)
                setError('')
              }}
              placeholder="현재 비밀번호를 입력해 주세요"
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
            <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] font-semibold leading-5 text-slate-500 sm:text-xs">
              연결 후에는 이메일·비밀번호와 {providerName} 로그인 중 편한 방법을 사용할 수 있어요.
            </p>
            {error && <p className="mt-3 text-xs font-bold text-red-600" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={!currentPassword || submitting}
              className={`mt-4 h-10 w-full rounded-xl text-sm font-black shadow-sm transition sm:h-11 sm:text-[15px] ${currentPassword && !submitting ? provider === 'naver' ? 'bg-[#03A94D] text-white hover:brightness-95' : 'bg-[#FEE500] text-[rgba(0,0,0,0.85)] hover:brightness-95' : provider === 'naver' ? 'cursor-default bg-[#A7DDBF] text-white' : 'cursor-default bg-[#FFF49A] text-slate-500'}`}
            >
              {submitting ? <>연결 중<AnimatedLoadingDots /></> : `${providerName} 계정 연결하기`}
            </button>
          </form>
        </AuthCard>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout backTo="/login" wide compactFooter>
      <AuthCard
        eyebrow={`${providerName}로 시작하기`}
        title="가입을 위해 확인해 주세요"
        description={`필수 내용을 확인하면 ${providerName} 계정으로 가입돼요.`}
        wide
        centered
      >
        <form className="mt-4 text-left" onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-[13px] font-black text-slate-800 sm:text-sm">
              <input type="checkbox" checked={allAccepted} onChange={(event) => setAll(event.target.checked)} className="h-5 w-5 accent-[#6548E8]" />
              전체 동의하기
            </label>
            <div className="mx-4 h-px bg-slate-200" />
            <div className="space-y-1 px-4 py-2.5">
              <ConsentRow label="서비스 이용약관 동의" checked={consents.termsAccepted} onChange={(checked) => setConsents((current) => ({ ...current, termsAccepted: checked }))} href="/terms" />
              <ConsentRow label="개인정보 수집·이용 동의" checked={consents.privacyAccepted} onChange={(checked) => setConsents((current) => ({ ...current, privacyAccepted: checked }))} href="/privacy" />
              <ConsentRow label="만 14세 이상입니다" checked={consents.ageConfirmed} onChange={(checked) => setConsents((current) => ({ ...current, ageConfirmed: checked }))} />
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] font-semibold leading-5 text-slate-500 sm:text-xs">
            <p><strong className="text-slate-600">수집 항목</strong> {providerName} 회원번호, 이메일(제공된 경우), 약관 동의 기록</p>
            <p><strong className="text-slate-600">이용 목적</strong> 회원 식별 및 {providerName} 로그인</p>
            <p><strong className="text-slate-600">보유 기간</strong> 회원 탈퇴 시까지</p>
            <p><strong className="text-slate-600">동의 거부</strong> 거부할 수 있으나 회원가입이 제한됩니다.</p>
          </div>
          {error && <p className="mt-3 text-xs font-bold text-red-600" role="alert">{error}</p>}
          <button type="submit" disabled={!allAccepted || submitting} className={`mt-4 h-10 w-full rounded-xl text-sm font-black text-white shadow-sm transition sm:h-11 sm:text-[15px] ${allAccepted && !submitting ? 'bg-[#6548E8] hover:bg-[#5639DC]' : 'cursor-default bg-[#CFC5FF]'}`}>
            {submitting ? <>가입 처리 중<AnimatedLoadingDots /></> : '동의하고 가입하기'}
          </button>
        </form>
      </AuthCard>
    </AuthLayout>
  )
}

function ConsentRow({ label, checked, onChange, href }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13px] font-bold text-slate-700 sm:text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 shrink-0 accent-[#6548E8]" />
      <span className="min-w-0 flex-1"><span className="text-[#6548E8]">[필수]</span> {label}</span>
      {href && <a href={href} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-extrabold text-slate-500 underline underline-offset-2">보기</a>}
    </label>
  )
}

export default SocialSignupPage
