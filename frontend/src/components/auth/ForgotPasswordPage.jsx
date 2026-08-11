import { useState } from 'react'
import { Mail } from 'lucide-react'
import { requestPasswordReset } from '../../services/authApi'
import AuthCard from './AuthCard'
import AuthField from './AuthField'
import AuthLayout from './AuthLayout'
import AnimatedLoadingDots from '../AnimatedLoadingDots'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const emailValid = EMAIL_PATTERN.test(email.trim())

  const handleChange = (event) => {
    setEmail(event.target.value)
    setNotice('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!emailValid || submitting) return

    setSubmitting(true)
    setError('')
    try {
      const response = await requestPasswordReset(email.trim())
      setNotice(response.message)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout backTo="/login" wide>
      <AuthCard
        eyebrow="계정 도움"
        title="비밀번호를 잊으셨나요?"
        description="가입한 이메일을 입력하면 재설정 방법을 안내해 드려요."
        wide
        centered
      >
        <form className="mt-4 space-y-3 text-left" onSubmit={handleSubmit} noValidate>
          <AuthField
            label="이메일"
            icon={Mail}
            type="email"
            value={email}
            onChange={handleChange}
            placeholder="이메일 주소를 입력해 주세요"
            autoComplete="email"
            message={email && !emailValid ? '올바른 이메일 주소를 입력해 주세요.' : ''}
            messageTone="error"
            required
          />
          <button
            type="submit"
            disabled={!emailValid || submitting}
            className={`h-10 w-full rounded-xl text-sm font-black text-white shadow-sm transition sm:h-11 sm:text-[15px] ${
              emailValid && !submitting
                ? 'bg-[#6548E8] hover:bg-[#5639DC]'
                : 'cursor-default bg-[#CFC5FF]'
            }`}
          >
            {submitting ? <>메일 보내는 중<AnimatedLoadingDots /></> : '재설정 안내 받기'}
          </button>
        </form>

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3.5 py-3 text-xs font-bold leading-5 text-red-600" role="alert">
            {error}
          </p>
        )}

        {notice && (
          <div className="mt-3 rounded-xl bg-[#F2EFFF] px-3.5 py-3 text-center" role="status">
            <p className="text-xs font-bold leading-5 text-[#6548E8]">{notice}</p>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">
              메일이 보이지 않으면 스팸함을 확인해 주세요.
            </p>
          </div>
        )}

        <p className="mt-4 text-center text-[13px] font-medium text-slate-600 sm:text-sm">
          비밀번호가 기억나셨나요?{' '}
          <a href="/login" className="font-black text-[#6548E8] hover:underline">로그인</a>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
