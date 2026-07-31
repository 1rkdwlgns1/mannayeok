import { MailCheck } from 'lucide-react'
import AuthCard from './AuthCard'
import AuthLayout from './AuthLayout'

function VerifyEmailPage() {
  const searchParams = new URLSearchParams(window.location.search)
  const email = searchParams.get('email')

  return (
    <AuthLayout backTo="/login">
      <AuthCard
        eyebrow="이메일 확인"
        title="메일함을 확인해 주세요"
        description={email ? `${email} 주소로 인증 안내를 보낼 예정이에요.` : '이메일 인증 기능은 준비 중이에요.'}
      >
        <div className="mt-6 rounded-2xl bg-[#F2EFFF] p-5 text-center">
          <MailCheck className="mx-auto text-[#6548E8]" size={34} strokeWidth={2} />
          <p className="mt-3 text-sm font-bold leading-6 text-slate-700">이메일 발송과 인증 API는 다음 단계에서 연결됩니다.</p>
        </div>
        <a href="/login" className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[#6548E8] text-sm font-black text-white shadow-sm transition hover:bg-[#5639DC]">
          로그인으로 이동
        </a>
      </AuthCard>
    </AuthLayout>
  )
}

export default VerifyEmailPage
