import { useMemo, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { signup } from '../../services/authApi'
import AuthCard from './AuthCard'
import AuthField from './AuthField'
import AuthLayout from './AuthLayout'

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
  const [form, setForm] = useState({ email: '', password: '', passwordConfirm: '' })
  const [requestError, setRequestError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [passwordConfirmVisible, setPasswordConfirmVisible] = useState(false)

  const emailValid = EMAIL_PATTERN.test(form.email.trim())
  const passwordValid = PASSWORD_PATTERN.test(form.password)
  const passwordConfirmValid = Boolean(form.passwordConfirm) && form.password === form.passwordConfirm
  const formValid = emailValid && passwordValid && passwordConfirmValid

  const feedback = useMemo(() => ({
    email: form.email
      ? {
          message: emailValid ? '사용할 수 있는 이메일이에요.' : '올바른 이메일 주소를 입력해 주세요.',
          tone: emailValid ? 'success' : 'error',
        }
      : null,
    password: {
      message: '영문과 숫자를 포함한 8자 이상 입력해 주세요.',
      tone: form.password && !passwordValid ? 'error' : 'neutral',
    },
    passwordConfirm: form.passwordConfirm
      ? {
          message: passwordConfirmValid ? '비밀번호가 일치해요.' : '비밀번호가 일치하지 않아요.',
          tone: passwordConfirmValid ? 'success' : 'error',
        }
      : null,
  }), [emailValid, form.email, form.password, form.passwordConfirm, passwordConfirmValid, passwordValid])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setRequestError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!formValid || submitting) return

    setSubmitting(true)
    try {
      await signup({ email: form.email.trim(), password: form.password })
      window.location.replace('/login?signup=complete')
    } catch (error) {
      setRequestError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout backTo="/login" wide>
      <AuthCard
        eyebrow="만나역 회원가입"
        title="새 계정을 만들어요"
        description="이메일로 간단하게 만나역을 시작해 보세요."
        wide
        centered
      >
        <form className="mt-4 space-y-3 text-left" onSubmit={handleSubmit} noValidate>
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
            <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm font-bold text-red-600" role="alert">
              {requestError}
            </p>
          )}
          <button
            type="submit"
            disabled={!formValid || submitting}
            className={`h-11 w-full rounded-xl text-[15px] font-black text-white shadow-sm transition ${
              formValid && !submitting
                ? 'bg-[#6548E8] hover:bg-[#5639DC]'
                : 'cursor-not-allowed bg-[#CFC5FF]'
            }`}
          >
            {submitting ? '가입 처리 중...' : '회원가입'}
          </button>
        </form>
        <p className="mt-3 text-center text-[11px] font-semibold leading-5 text-slate-600 md:text-xs">
          가입을 계속하면 만나역{' '}
          <a href="/#terms" className="font-extrabold text-[#6548E8] hover:underline">이용약관</a>
          {' '}및{' '}
          <a href="/#privacy" className="font-extrabold text-[#6548E8] hover:underline">개인정보처리방침</a>
          에 동의하게 됩니다.
        </p>
        <p className="mt-2.5 text-center text-sm font-medium text-slate-600">
          이미 회원이신가요? <a href="/login" className="font-black text-[#6548E8] hover:underline">로그인</a>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}

export default SignupPage
