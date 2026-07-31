import { useState } from 'react'
import { signup } from '../../services/authApi'
import AuthCard from './AuthCard'
import AuthField from './AuthField'
import AuthLayout from './AuthLayout'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form) {
  const errors = {}
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = '올바른 이메일 주소를 입력해 주세요.'
  if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
    errors.password = '영문과 숫자를 포함해 8자 이상 입력해 주세요.'
  }
  if (form.password !== form.passwordConfirm) errors.passwordConfirm = '비밀번호가 일치하지 않아요.'
  const nicknameLength = form.nickname.trim().length
  if (nicknameLength < 2 || nicknameLength > 20) errors.nickname = '닉네임은 2~20자로 입력해 주세요.'
  return errors
}

function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '', passwordConfirm: '', nickname: '' })
  const [errors, setErrors] = useState({})
  const [requestError, setRequestError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setRequestError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setSubmitting(true)
    try {
      await signup({ email: form.email.trim(), password: form.password, nickname: form.nickname.trim() })
      window.location.replace('/login?signup=complete')
    } catch (error) {
      setRequestError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout backTo="/login">
      <AuthCard eyebrow="만나역 회원가입" title="새 계정을 만들어요" description="계정 정보만 안전하게 관리하며 추천 결과에는 영향을 주지 않아요.">
        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <AuthField label="이메일" type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@example.com" autoComplete="email" error={errors.email} />
          <AuthField label="비밀번호" type="password" name="password" value={form.password} onChange={handleChange} placeholder="영문·숫자 포함 8자 이상" autoComplete="new-password" error={errors.password} />
          <AuthField label="비밀번호 확인" type="password" name="passwordConfirm" value={form.passwordConfirm} onChange={handleChange} placeholder="비밀번호를 다시 입력해 주세요" autoComplete="new-password" error={errors.passwordConfirm} />
          <AuthField label="닉네임" type="text" name="nickname" value={form.nickname} onChange={handleChange} placeholder="2~20자" autoComplete="nickname" maxLength={20} error={errors.nickname} />
          {requestError && <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm font-bold text-red-600" role="alert">{requestError}</p>}
          <button type="submit" disabled={submitting} className="h-12 w-full rounded-xl bg-[#6548E8] text-sm font-black text-white shadow-sm transition hover:bg-[#5639DC] disabled:cursor-wait disabled:opacity-60">
            {submitting ? '가입 중...' : '회원가입'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm font-medium text-slate-600">
          이미 회원이신가요? <a href="/login" className="font-black text-[#6548E8] hover:underline">로그인</a>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}

export default SignupPage
