import { useMemo, useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { resetPassword } from '../../services/authApi'
import AuthCard from './AuthCard'
import AuthField from './AuthField'
import AuthLayout from './AuthLayout'

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

function ResetPasswordPage() {
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get('token')?.trim() || '',
    [],
  )
  const [form, setForm] = useState({ password: '', passwordConfirm: '' })
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [passwordConfirmVisible, setPasswordConfirmVisible] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const passwordValid = PASSWORD_PATTERN.test(form.password)
  const passwordConfirmValid = Boolean(form.passwordConfirm)
    && form.password === form.passwordConfirm
  const formValid = Boolean(token) && passwordValid && passwordConfirmValid

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!formValid || submitting) return

    setSubmitting(true)
    setError('')
    try {
      await resetPassword({ token, password: form.password })
      window.location.replace('/login?passwordReset=complete')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout backTo="/login" wide compactFooter>
      <AuthCard
        eyebrow="계정 도움"
        title="새 비밀번호를 설정해요"
        description="앞으로 사용할 새 비밀번호를 입력해 주세요."
        wide
        centered
      >
        {!token ? (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-4 text-center">
            <p className="text-sm font-bold text-red-600">재설정 링크가 올바르지 않아요.</p>
            <a
              href="/forgot-password"
              className="mt-2 inline-block text-xs font-black text-[#6548E8] underline underline-offset-2"
            >
              새 링크 요청하기
            </a>
          </div>
        ) : (
          <form className="mt-4 space-y-3 text-left" onSubmit={handleSubmit} noValidate>
            <AuthField
              label="새 비밀번호"
              icon={LockKeyhole}
              type={passwordVisible ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="영문과 숫자를 포함한 8자 이상"
              autoComplete="new-password"
              message="영문과 숫자를 포함한 8자 이상 입력해 주세요."
              messageTone={!form.password ? 'neutral' : passwordValid ? 'success' : 'error'}
              trailing={(
                <PasswordToggle
                  visible={passwordVisible}
                  onToggle={() => setPasswordVisible((visible) => !visible)}
                  label="새 비밀번호"
                />
              )}
              required
            />
            <AuthField
              label="새 비밀번호 확인"
              icon={LockKeyhole}
              type={passwordConfirmVisible ? 'text' : 'password'}
              name="passwordConfirm"
              value={form.passwordConfirm}
              onChange={handleChange}
              placeholder="새 비밀번호를 다시 입력해 주세요"
              autoComplete="new-password"
              message={form.passwordConfirm
                ? passwordConfirmValid
                  ? '비밀번호가 일치해요.'
                  : '비밀번호가 일치하지 않아요.'
                : ''}
              messageTone={passwordConfirmValid ? 'success' : 'error'}
              trailing={(
                <PasswordToggle
                  visible={passwordConfirmVisible}
                  onToggle={() => setPasswordConfirmVisible((visible) => !visible)}
                  label="새 비밀번호 확인"
                />
              )}
              required
            />
            {error && (
              <p className="rounded-xl bg-red-50 px-3.5 py-3 text-xs font-bold leading-5 text-red-600" role="alert">
                {error}
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
              {submitting ? '변경 처리 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  )
}

export default ResetPasswordPage
