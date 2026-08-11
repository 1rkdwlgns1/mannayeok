import { Link2, X } from 'lucide-react'
import AnimatedLoadingDots from '../components/AnimatedLoadingDots'

function ResultShareDialog({
  stationName,
  originNames,
  resultLabel = '만나역 추천',
  resultBadge = '최적 추천역',
  description = '친구가 같은 추천 결과를 바로 확인할 수 있어요.',
  kakaoShareStatus,
  kakaoShareError,
  shareLinkStatus,
  shareLinkError,
  shareCopyStatus,
  onKakaoShare,
  onCopyLink,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-share-title"
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div>
            <p className="text-xs font-black text-[#5A45E8]">결과 공유</p>
            <h2 id="result-share-title" className="mt-1 text-xl font-black text-slate-950">
              약속 장소를 같이 정해보세요
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="공유창 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mx-5 rounded-xl border border-violet-100 bg-violet-50/60 p-4 sm:mx-6">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500">
            {originNames.map((originName, index) => (
              <span key={`${originName}-${index}`} className="rounded-md bg-white px-2 py-1 shadow-sm">
                {originName}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-end justify-between gap-4 border-t border-violet-100 pt-3">
            <div>
              <p className="text-[11px] font-bold text-slate-400">{resultLabel}</p>
              <p className="mt-0.5 text-2xl font-black text-slate-950">{stationName}</p>
            </div>
            <span className="rounded-lg bg-[#5A45E8] px-2.5 py-1.5 text-xs font-black text-white">
              {resultBadge}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onKakaoShare}
            disabled={kakaoShareStatus === 'loading' || shareLinkStatus === 'loading'}
            className="flex h-14 min-w-0 items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-2.5 text-left text-[#191919] shadow-[0_6px_16px_rgba(254,229,0,0.16)] transition hover:bg-[#F5DC00] active:scale-[0.99] disabled:cursor-wait disabled:bg-[#FFF4A8] disabled:text-black/45 disabled:shadow-none"
          >
            <span className="grid w-[8.5rem] min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5">
                <img
                  src="/auth/kakao-login-symbol.png"
                  alt=""
                  className="h-5 w-5 object-contain"
                  aria-hidden="true"
                />
              </span>
              <span className="min-w-0 truncate text-center text-[12px] font-black sm:text-sm">
                {kakaoShareStatus === 'loading' || shareLinkStatus === 'loading'
                  ? <>연결 중<AnimatedLoadingDots /></>
                  : kakaoShareStatus === 'error' || shareLinkStatus === 'error'
                    ? '다시 시도'
                    : '카카오톡 공유'}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={onCopyLink}
            disabled={shareLinkStatus === 'loading'}
            className="flex h-14 min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-left text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-[#5A45E8] active:scale-[0.99] disabled:cursor-wait disabled:text-slate-400"
          >
            <span className="grid w-[8.5rem] min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <Link2 className="h-4.5 w-4.5" strokeWidth={2.3} aria-hidden="true" />
              </span>
              <span className="min-w-0 truncate text-center text-[12px] font-black sm:text-sm">
                {shareLinkStatus === 'loading' ? (
                  <>생성 중<AnimatedLoadingDots /></>
                ) : shareCopyStatus === 'copied' ? '복사 완료' : '링크 복사'}
              </span>
            </span>
          </button>
        </div>
        <p className="-mt-1 px-5 pb-4 text-center text-[11px] font-semibold text-slate-400 sm:px-6">
          공유 링크는 생성한 날부터 30일 동안 사용할 수 있어요.
        </p>
        {kakaoShareStatus === 'error' || shareLinkStatus === 'error' ? (
          <p className="mx-5 -mt-1 mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-600 sm:mx-6">
            {shareLinkError || kakaoShareError}
          </p>
        ) : null}
        <div className="border-t border-slate-100 px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-full rounded-lg text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            취소
          </button>
        </div>
      </section>
    </div>
  )
}

export default ResultShareDialog
