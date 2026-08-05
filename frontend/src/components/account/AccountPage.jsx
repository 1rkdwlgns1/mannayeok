import { KeyRound, LogOut, Mail, ShieldAlert, UserRound } from 'lucide-react'
import AuthLayout from '../auth/AuthLayout.jsx'
import { clearAuth, getStoredMember } from '../../services/authStorage.js'

function AccountPage() {
  const member = getStoredMember()

  if (!member) {
    window.location.replace('/login')
    return null
  }

  const handleLogout = () => {
    clearAuth()
    window.location.replace('/')
  }

  return (
    <AuthLayout backTo="/" backLabel="메인 화면으로 돌아가기" wide compactFooter>
      <section className="w-full max-w-[520px] rounded-[22px] border border-[#DDD6FF] bg-white/95 p-5 shadow-[0_18px_55px_rgba(75,55,160,0.11)] backdrop-blur sm:rounded-[26px] sm:p-7">
        <header className="text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F1EEFF] text-[#6548E8]">
            <UserRound className="h-5 w-5" strokeWidth={2.3} aria-hidden="true" />
          </div>
          <p className="mt-3 text-xs font-extrabold text-[#6548E8]">계정 관리</p>
          <h1 className="mt-1 text-[24px] font-black tracking-[-0.04em] text-slate-950 sm:text-[28px]">내 계정</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">로그인 정보와 계정 보안을 관리해요.</p>
        </header>

        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
              <Mail className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
              로그인 이메일
            </div>
            <p className="mt-2 break-all text-sm font-black text-slate-900 sm:text-base">{member.email}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
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
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-white text-sm font-black text-red-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            로그아웃
          </button>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-red-700">
              <ShieldAlert className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
              회원탈퇴
            </div>
            <p className="mt-1.5 text-xs font-medium leading-5 text-red-700/75">탈퇴하면 계정 정보가 삭제되며 되돌릴 수 없어요.</p>
            <a
              href="/account/delete"
              className="mt-3 inline-flex h-9 items-center rounded-xl border border-red-200 bg-white px-3 text-xs font-black text-red-600 transition hover:border-red-300 hover:bg-red-50"
            >
              회원탈퇴
            </a>
          </div>
        </div>
      </section>
    </AuthLayout>
  )
}

export default AccountPage
