import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { checkEmailAvailability, signup } from '../../services/authApi'
import AuthCard from './AuthCard'
import AuthField from './AuthField'
import AuthLayout from './AuthLayout'
import AnimatedLoadingDots from '../AnimatedLoadingDots'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/

function PasswordToggle({ visible, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-[#6548E8]"
      aria-label={visible ? `${label} 숨기기` : `${label} 보기`}
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )
}

function SignupPage() {
  const [step, setStep] = useState('consent')
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    termsAccepted: false,
    privacyAccepted: false,
    ageConfirmed: false,
  })
  const [requestError, setRequestError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [emailStatus, setEmailStatus] = useState('idle')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [passwordConfirmVisible, setPasswordConfirmVisible] = useState(false)

  const emailValid = EMAIL_PATTERN.test(form.email.trim())
  const passwordValid = PASSWORD_PATTERN.test(form.password)
  const passwordConfirmValid = Boolean(form.passwordConfirm) && form.password === form.passwordConfirm
  const formValid = emailStatus === 'available'
    && passwordValid
    && passwordConfirmValid
    && form.termsAccepted
    && form.privacyAccepted
    && form.ageConfirmed
  const consentValid = form.termsAccepted && form.privacyAccepted && form.ageConfirmed

  useEffect(() => {
    if (!emailValid) return undefined

    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const result = await checkEmailAvailability(form.email.trim())
        if (!cancelled) setEmailStatus(result.available ? 'available' : 'unavailable')
      } catch {
        if (!cancelled) setEmailStatus('error')
      }
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [emailValid, form.email])

  const feedback = useMemo(() => ({
    email: form.email
      ? {
          message: !emailValid
            ? '올바른 이메일 주소를 입력해 주세요.'
            : {
                checking: '이메일 중복을 확인하고 있어요.',
                available: '사용할 수 있는 이메일이에요.',
                unavailable: '이미 가입된 이메일이에요.',
                error: '이메일 중복 확인에 실패했어요. 잠시 후 다시 시도해 주세요.',
              }[emailStatus],
          tone: !emailValid
            ? 'error'
            : emailStatus === 'available'
              ? 'success'
              : ['unavailable', 'error'].includes(emailStatus)
                ? 'error'
                : 'neutral',
        }
      : null,
    password: {
      message: '영문과 숫자를 포함한 8자 이상 입력해 주세요.',
      tone: !form.password ? 'neutral' : passwordValid ? 'success' : 'error',
    },
    passwordConfirm: form.passwordConfirm
      ? {
          message: passwordConfirmValid ? '비밀번호가 일치해요.' : '비밀번호가 일치하지 않아요.',
          tone: passwordConfirmValid ? 'success' : 'error',
        }
      : null,
  }), [
    emailStatus,
    emailValid,
    form.email,
    form.password,
    form.passwordConfirm,
    passwordConfirmValid,
    passwordValid,
  ])

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (name === 'email') {
      setEmailStatus(EMAIL_PATTERN.test(value.trim()) ? 'checking' : 'idle')
    }
    setRequestError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!formValid || submitting) return

    setSubmitting(true)
    try {
      await signup({
        email: form.email.trim(),
        password: form.password,
        termsAccepted: form.termsAccepted,
        privacyAccepted: form.privacyAccepted,
        ageConfirmed: form.ageConfirmed,
      })
      window.location.replace('/login?signup=complete')
    } catch (error) {
      if (error.message === '이미 가입된 이메일이에요.') {
        setEmailStatus('unavailable')
      } else {
        setRequestError(error.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleConsentChange = (event) => {
    const { name, checked } = event.target
    setForm((current) => ({ ...current, [name]: checked }))
    setRequestError('')
  }

  const handleAllConsentChange = (event) => {
    const checked = event.target.checked
    setForm((current) => ({
      ...current,
      termsAccepted: checked,
      privacyAccepted: checked,
      ageConfirmed: checked,
    }))
    setRequestError('')
  }

  if (step === 'consent') {
    return (
      <AuthLayout backTo="/login" wide compactFooter>
        <AuthCard
          eyebrow="만나역 회원가입"
          title="가입을 위해 확인해 주세요"
          description="필수 내용을 확인하면 계정 정보를 입력할 수 있어요."
          wide
          centered
        >
          <div className="mt-4 text-left">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-[13px] font-black text-slate-800 sm:text-sm">
                <input
                  type="checkbox"
                  checked={consentValid}
                  onChange={handleAllConsentChange}
                  className="h-5 w-5 shrink-0 accent-[#6548E8]"
                />
                전체 동의하기
              </label>

              <div className="mx-4 h-px bg-slate-200" aria-hidden="true" />

              <div className="space-y-1 px-4 py-2.5">
              <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13px] font-bold text-slate-700 sm:text-sm">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={form.termsAccepted}
                  onChange={handleConsentChange}
                  className="h-4 w-4 shrink-0 accent-[#6548E8]"
                />
                <span className="min-w-0 flex-1"><span className="text-[#6548E8]">[필수]</span> 서비스 이용약관 동의</span>
                <a href="/terms" target="_blank" rel="noreferrer" className="shrink-0 text-xs font-extrabold text-slate-500 underline underline-offset-2">보기</a>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13px] font-bold text-slate-700 sm:text-sm">
                <input
                  type="checkbox"
                  name="privacyAccepted"
                  checked={form.privacyAccepted}
                  onChange={handleConsentChange}
                  className="h-4 w-4 shrink-0 accent-[#6548E8]"
                />
                <span className="min-w-0 flex-1"><span className="text-[#6548E8]">[필수]</span> 개인정보 수집·이용 동의</span>
                <a href="/privacy" target="_blank" rel="noreferrer" className="shrink-0 text-xs font-extrabold text-slate-500 underline underline-offset-2">보기</a>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13px] font-bold text-slate-700 sm:text-sm">
                <input
                  type="checkbox"
                  name="ageConfirmed"
                  checked={form.ageConfirmed}
                  onChange={handleConsentChange}
                  className="h-4 w-4 shrink-0 accent-[#6548E8]"
                />
                <span><span className="text-[#6548E8]">[필수]</span> 만 14세 이상입니다</span>
              </label>
              </div>
            </div>

            <div className="mt-3 space-y-1 rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] font-semibold leading-5 text-slate-500 sm:text-xs">
              <p><strong className="text-slate-600">수집 항목</strong> 이메일, 일방향 암호화된 비밀번호, 약관 동의 기록</p>
              <p><strong className="text-slate-600">이용 목적</strong> 회원 식별, 로그인, 비밀번호 재설정, 약관 동의 확인</p>
              <p><strong className="text-slate-600">보유 기간</strong> 회원 탈퇴 시까지</p>
              <p><strong className="text-slate-600">동의 거부</strong> 거부할 수 있으나 회원가입이 제한됩니다.</p>
            </div>

            <button
              type="button"
              disabled={!consentValid}
              onClick={() => setStep('account')}
              className={`mt-4 h-10 w-full rounded-xl text-sm font-black text-white shadow-sm transition sm:h-11 sm:text-[15px] ${
                consentValid
                  ? 'bg-[#6548E8] hover:bg-[#5639DC]'
                  : 'cursor-default bg-[#CFC5FF]'
              }`}
            >
              확인
            </button>
          </div>
        </AuthCard>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      backTo="/login"
      onBack={() => setStep('consent')}
      wide
      compactFooter
    >
      <AuthCard
        eyebrow="만나역 회원가입"
        title="새 계정을 만들어요"
        description="이메일로 간단하게 만나역을 시작해 보세요."
        wide
        centered
      >
        <form className="mt-3 space-y-2.5 text-left" onSubmit={handleSubmit} noValidate>
          <AuthField
            label="이메일"
            icon={Mail}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="이메일 주소를 입력해 주세요"
            autoComplete="email"
            message={feedback.email?.message}
            messageTone={feedback.email?.tone}
            required
          />
          <AuthField
            label="비밀번호"
            icon={LockKeyhole}
            type={passwordVisible ? 'text' : 'password'}
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="영문과 숫자를 포함한 8자 이상"
            autoComplete="new-password"
            message={feedback.password.message}
            messageTone={feedback.password.tone}
            trailing={(
              <PasswordToggle
                visible={passwordVisible}
                onToggle={() => setPasswordVisible((value) => !value)}
                label="비밀번호"
              />
            )}
            required
          />
          <AuthField
            label="비밀번호 확인"
            icon={LockKeyhole}
            type={passwordConfirmVisible ? 'text' : 'password'}
            name="passwordConfirm"
            value={form.passwordConfirm}
            onChange={handleChange}
            placeholder="비밀번호를 다시 입력해 주세요"
            autoComplete="new-password"
            message={feedback.passwordConfirm?.message}
            messageTone={feedback.passwordConfirm?.tone}
            trailing={(
              <PasswordToggle
                visible={passwordConfirmVisible}
                onToggle={() => setPasswordConfirmVisible((value) => !value)}
                label="비밀번호 확인"
              />
            )}
            required
          />
          {requestError && (
            <p className="rounded-xl bg-red-50 px-3.5 py-3 text-xs font-bold text-red-600 sm:text-sm" role="alert">
              {requestError}
            </p>
          )}
          <button
            type="submit"
            disabled={!formValid || submitting}
            className={`h-10 w-full rounded-xl text-sm font-black text-white shadow-sm transition sm:h-11 sm:text-[15px] ${
              formValid && !submitting
                ? 'bg-[#6548E8] hover:bg-[#5639DC]'
                : 'cursor-default bg-[#CFC5FF]'
            }`}
          >
            {submitting ? <>가입 처리 중<AnimatedLoadingDots /></> : '회원가입'}
          </button>
        </form>
        <p className="mt-2.5 text-center text-[13px] font-medium text-slate-600 sm:text-sm">
          이미 회원이신가요? <a href="/login" className="font-black text-[#6548E8] hover:underline">로그인</a>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}

export default SignupPage
