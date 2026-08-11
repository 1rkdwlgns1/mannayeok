import {
  CalendarHeart,
  ChevronDown,
  CircleHelp,
  FilePenLine,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageCircle,
  UserRound,
  X,
} from 'lucide-react'
import logoImage from '../assets/rogo-optimized.png'

function Header({
  currentMember,
  isAdmin,
  accountMenuOpen,
  mobileMenuOpen,
  adminInquirySheetUrl,
  onNotice,
  onInquiry,
  onOpenGuide,
  onOpenMobileGuide,
  onOpenSavedMeetings,
  onToggleAccountMenu,
  onAuthAction,
  onOpenAccount,
  onOpenNoticeAdmin,
  onOpenAdminInquiries,
  onLogout,
  onToggleMobileMenu,
}) {
  return (
    <div className="relative z-[130] flex min-h-16 items-start justify-between px-0 py-0 md:min-h-20">
      <div className="relative flex min-w-0 items-start">
        <a
          href="/"
          className="block h-16 w-44 overflow-visible focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 sm:w-64 md:h-20 md:w-72"
          aria-label="만나역 메인 화면으로 이동"
        >
          <img
            src={logoImage}
            alt="만나역"
            className="h-full w-full origin-left -translate-x-7 translate-y-1 scale-[1.6] object-contain object-left sm:-translate-x-10 sm:scale-[1.95] md:-translate-x-11 md:translate-y-1.5 md:scale-[2.15]"
          />
        </a>
        <BetaBadge className="absolute left-24 top-3 md:left-36 md:top-4" />
      </div>

      <nav className="relative z-10 mt-5 hidden shrink-0 items-center gap-1 md:flex" aria-label="서비스 메뉴">
        <HeaderAction icon={Megaphone} label="공지사항" onClick={onNotice} />
        <HeaderAction icon={Mail} label="문의하기" onClick={onInquiry} />
        <HeaderAction icon={CircleHelp} label="이용안내" onClick={onOpenGuide} />
        {currentMember ? (
          <HeaderAction icon={CalendarHeart} label="내 약속" onClick={onOpenSavedMeetings} />
        ) : null}
        {currentMember ? (
          <div className="relative ml-1">
            <button
              type="button"
              onClick={onToggleAccountMenu}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#DCD5FF] bg-white px-3.5 text-sm font-black text-[#5A45E8] shadow-sm transition hover:border-[#BFB3FF] hover:bg-violet-50 active:scale-[0.98]"
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
            >
              <UserRound className="h-4 w-4" strokeWidth={2.3} aria-hidden="true" />
              {isAdmin ? '관리자' : '내 계정'}
              <ChevronDown className={`h-3.5 w-3.5 transition ${accountMenuOpen ? 'rotate-180' : ''}`} strokeWidth={2.4} aria-hidden="true" />
            </button>
            {accountMenuOpen ? (
              <div className="absolute right-0 top-12 z-[120] w-44 overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl" role="menu">
                <MobileMenuAction icon={UserRound} label="계정 관리" onClick={onOpenAccount} />
                {isAdmin ? <MobileMenuAction icon={FilePenLine} label="공지 추가/수정" onClick={onOpenNoticeAdmin} /> : null}
                {isAdmin && adminInquirySheetUrl ? <MobileMenuAction icon={MessageCircle} label="문의 보기" onClick={onOpenAdminInquiries} /> : null}
                <MobileMenuAction icon={LogOut} label="로그아웃" onClick={onLogout} danger />
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={onAuthAction}
            className="ml-1 inline-flex h-10 items-center rounded-xl border border-[#DCD5FF] bg-white px-3.5 text-sm font-black text-[#5A45E8] shadow-sm transition hover:border-[#BFB3FF] hover:bg-violet-50 active:scale-[0.98]"
          >
            로그인
          </button>
        )}
      </nav>

      <div className="relative z-10 mt-2.5 flex shrink-0 items-center gap-1 md:hidden">
        <HeaderIconButton
          icon={Megaphone}
          label="공지사항"
          onClick={onNotice}
        />
        <button
          type="button"
          onClick={currentMember ? onOpenSavedMeetings : onAuthAction}
          className={`inline-flex h-10 items-center rounded-xl text-xs font-black text-[#5A45E8] transition active:scale-[0.98] ${currentMember ? 'w-10 justify-center hover:bg-white' : 'border border-[#DCD5FF] bg-white px-3 shadow-sm'}`}
          aria-label={currentMember ? '내 약속' : '로그인'}
          title={currentMember ? '내 약속' : undefined}
        >
          {currentMember ? (
            <CalendarHeart className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
          ) : '로그인'}
        </button>
        <HeaderIconButton
          icon={mobileMenuOpen ? X : Menu}
          label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          onClick={onToggleMobileMenu}
        />
        {mobileMenuOpen ? (
          <div className="absolute right-0 top-11 z-[120] w-40 overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl">
            <MobileMenuAction icon={Mail} label="문의하기" onClick={onInquiry} />
            <MobileMenuAction
              icon={CircleHelp}
              label="이용안내"
              onClick={onOpenMobileGuide}
            />
            {currentMember ? (
              <>
                <MobileMenuAction icon={UserRound} label="계정 관리" onClick={onOpenAccount} />
                {isAdmin ? <MobileMenuAction icon={FilePenLine} label="공지 추가/수정" onClick={onOpenNoticeAdmin} /> : null}
                {isAdmin && adminInquirySheetUrl ? <MobileMenuAction icon={MessageCircle} label="문의 보기" onClick={onOpenAdminInquiries} /> : null}
                <MobileMenuAction icon={LogOut} label="로그아웃" onClick={onLogout} danger />
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function HeaderAction({ icon: ActionIcon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-black text-slate-600 transition hover:bg-white hover:text-[#5A45E8] hover:shadow-sm"
    >
      <ActionIcon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}

function HeaderIconButton({ icon: ActionIcon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white hover:text-[#5A45E8]"
      aria-label={label}
      title={label}
    >
      <ActionIcon className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
    </button>
  )
}

function MobileMenuAction({ icon: ActionIcon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition ${danger ? 'text-red-600 hover:bg-red-50 hover:text-red-700' : 'text-slate-700 hover:bg-violet-50 hover:text-[#5A45E8]'}`}
    >
      <ActionIcon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
      {label}
    </button>
  )
}

function BetaBadge({ className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-xl border border-violet-200 bg-white/95 px-2.5 py-1 text-[11px] font-black tracking-wide text-[#5A45E8] shadow-sm ring-1 ring-violet-50 ${className}`}
      aria-label="베타 서비스"
    >
      BETA
    </span>
  )
}

export default Header
