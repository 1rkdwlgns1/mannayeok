import { KeyRound, LogOut, Mail, ShieldAlert, UserRound } from 'lucide-react'
import AuthLayout from '../auth/AuthLayout.jsx'
import { clearAuth, getStoredMember } from '../../services/authStorage.js'

function AccountPage() {
  const member = getStoredMember()

  const handleBack = () => {
    try {
      if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
        window.history.back()
        return
      }
    } catch {
      // 유효한 이전 페이지가 없으면 메인 화면으로 이동한다.
    }
    window.location.assign('/')
  }

  if (!member) {
    window.location.replace('/login')
    return null
  }

  const handleLogout = () => {
    clearAuth()
    window.location.replace('/')
  }
  const isSocialLogin = ['KAKAO', 'NAVER'].includes(member.loginProvider)
  const kakaoLinked = member.linkedProviders?.includes('KAKAO') || member.loginProvider === 'KAKAO'
  const naverLinked = member.linkedProviders?.includes('NAVER') || member.loginProvider === 'NAVER'
  const isAdmin = member.role === 'ADMIN'
  const linkedProvider = new URLSearchParams(window.location.search).get('socialLinked')
  const socialLinked = ['kakao', 'naver'].includes(linkedProvider)

  return (
    <AuthLayout onBack={handleBack} backLabel="이전 화면으로 돌아가기" wide compactFooter>
      <section className="w-full max-w-[500px] rounded-[22px] border border-[#DDD6FF] bg-white/95 p-4 shadow-[0_18px_55px_rgba(75,55,160,0.11)] backdrop-blur sm:rounded-[26px] sm:p-6">
        <header className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F1EEFF] text-[#6548E8]">
            <UserRound className="h-[18px] w-[18px]" strokeWidth={2.3} aria-hidden="true" />
          </div>
          <h1 className="mt-2 text-[22px] font-black tracking-[-0.04em] text-slate-950 sm:text-[27px]">내 계정</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">계정 정보와 로그인 방식을 관리해요.</p>
        </header>

        {socialLinked && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs font-bold text-emerald-700" role="status">
            {linkedProvider === 'naver' ? '네이버' : '카카오'} 계정이 연결됐어요. 이제 간편 로그인도 사용할 수 있어요.
          </p>
        )}

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
              <Mail className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              이메일
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 break-all text-sm font-black text-slate-900 sm:text-[15px]">{member.email}</p>
              <div className="flex flex-wrap gap-1.5">
                {kakaoLinked && (
                  <span className="inline-flex h-7 shrink-0 items-center rounded-lg bg-[#FEE500] px-2.5 text-[11px] font-black text-[rgba(0,0,0,0.78)]">카카오 연결됨</span>
                )}
                {naverLinked && (
                  <span className="inline-flex h-7 shrink-0 items-center rounded-lg bg-[#03A94D] px-2.5 text-[11px] font-black text-white">네이버 연결됨</span>
                )}
              </div>
            </div>
          </div>

          {!isSocialLogin && <div className="border-t border-slate-100 px-4 py-3.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[13px] font-black text-slate-900 sm:text-sm">
                  <KeyRound className="h-4 w-4 text-[#6548E8]" strokeWidth={2.2} aria-hidden="true" />
                  비밀번호 변경
                </div>
                <p className="mt-1 text-xs font-medium leading-5 text-slate-500">이메일로 안전한 재설정 링크를 받아 변경할 수 있어요.</p>
              </div>
              <a
                href="/account/password"
                className="inline-flex h-9 shrink-0 items-center rounded-xl border border-[#D8D0FF] bg-[#F8F6FF] px-3 text-xs font-black text-[#5A45E8] transition hover:border-[#BFB3FF] hover:bg-[#F1EEFF]"
              >
                변경
              </a>
            </div>
          </div>}

        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[13px] font-black text-slate-700 transition hover:border-[#D8D0FF] hover:bg-[#F8F6FF] hover:text-[#5A45E8] sm:h-11 sm:text-sm"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            로그아웃
          </button>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className={`flex flex-col gap-3 rounded-2xl px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${isAdmin ? 'border border-violet-100 bg-violet-50/50' : 'border border-red-100 bg-red-50/45'}`}>
            <div className="min-w-0">
              <div className={`flex items-center gap-2 text-[13px] font-black sm:text-sm ${isAdmin ? 'text-[#5A45E8]' : 'text-red-700'}`}>
                <ShieldAlert className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                {isAdmin ? '관리자 계정 보호' : '회원탈퇴'}
              </div>
              <p className={`mt-1 text-xs font-medium leading-5 ${isAdmin ? 'text-slate-500' : 'text-red-700/75'}`}>
                {isAdmin ? '서비스 관리 계정은 회원탈퇴할 수 없어요.' : '계정과 저장된 정보가 삭제되며 되돌릴 수 없어요.'}
              </p>
            </div>
            {!isAdmin ? (
              <a
                href="/account/delete"
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white px-3 text-xs font-black text-red-600 transition hover:border-red-300 hover:bg-red-50"
              >
                탈퇴
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </AuthLayout>
  )
}

export default AccountPage
