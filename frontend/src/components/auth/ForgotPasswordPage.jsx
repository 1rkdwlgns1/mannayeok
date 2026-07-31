import { useState } from 'react'
import AuthCard from './AuthCard'
import AuthField from './AuthField'
import AuthLayout from './AuthLayout'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    setMessage('비밀번호 재설정 메일 기능은 준비 중이에요. 현재는 문의하기를 이용해 주세요.')
  }

  return (
    <AuthLayout backTo="/login">
      <AuthCard eyebrow="계정 도움" title="비밀번호를 잊으셨나요?" description="가입한 이메일 주소를 입력해 주세요.">
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <AuthField
            label="이메일"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setMessage('')
            }}
            placeholder="name@example.com"
            autoComplete="email"
            required
          />
          <button type="submit" className="h-12 w-full rounded-xl bg-[#6548E8] text-sm font-black text-white shadow-sm transition hover:bg-[#5639DC]">
            재설정 안내 받기
          </button>
        </form>
        {message && <p className="mt-4 rounded-xl bg-[#F2EFFF] px-3.5 py-3 text-sm font-bold leading-6 text-[#6548E8]" role="status">{message}</p>}
        <a href="/login" className="mx-auto mt-5 block w-fit text-sm font-black text-[#6548E8] hover:underline">로그인으로 돌아가기</a>
      </AuthCard>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
