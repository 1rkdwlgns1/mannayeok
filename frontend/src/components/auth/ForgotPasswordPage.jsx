import { useState } from 'react'
import { Mail } from 'lucide-react'
import AuthCard from './AuthCard'
import AuthField from './AuthField'
import AuthLayout from './AuthLayout'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const emailValid = EMAIL_PATTERN.test(email.trim())

  const handleChange = (event) => {
    setEmail(event.target.value)
    setNotice('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!emailValid) return

    setNotice('비밀번호 재설정 메일 기능을 준비하고 있어요. 긴급한 계정 문의는 문의하기를 이용해 주세요.')
  }

  return (
    <AuthLayout backTo="/login" wide hideFooter>
      <AuthCard
        eyebrow="계정 도움"
        title="비밀번호를 잊으셨나요?"
        description="가입한 이메일을 입력하면 재설정 방법을 안내해 드려요."
        wide
        centered
      >
        <form className="mt-5 space-y-3.5 text-left" onSubmit={handleSubmit} noValidate>
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
            disabled={!emailValid}
            className={`h-12 w-full rounded-xl text-[15px] font-black text-white shadow-sm transition ${
              emailValid
                ? 'bg-[#6548E8] hover:bg-[#5639DC]'
                : 'cursor-not-allowed bg-[#CFC5FF]'
            }`}
          >
            재설정 안내 받기
          </button>
        </form>

        {notice && (
          <div className="mt-3 rounded-xl bg-[#F2EFFF] px-3.5 py-3 text-center" role="status">
            <p className="text-xs font-bold leading-5 text-[#6548E8]">{notice}</p>
            <a
              href="mailto:1rkdwlgns1@gmail.com"
              className="mt-1 inline-block text-xs font-black text-[#5639DC] underline underline-offset-2"
            >
              계정 문의하기
            </a>
          </div>
        )}

        <p className="mt-4 text-center text-sm font-medium text-slate-600">
          비밀번호가 기억나셨나요?{' '}
          <a href="/login" className="font-black text-[#6548E8] hover:underline">로그인</a>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
