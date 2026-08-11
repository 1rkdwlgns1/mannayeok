import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  MapPin,
  Pencil,
  RefreshCw,
  Share2,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'

const COLLABORATIVE_MEETINGS_ENABLED = false
const SAVED_RESULT_MAP_LINKS_ENABLED = false
const SAVED_RESULT_SHARING_ENABLED = false

function CollaborationPanel({
  meeting,
  status,
  error,
  onCreate,
  onCopyInvite,
  onRecalculate,
  onRemoveParticipant,
}) {
  if (status === 'loading') {
    return (
      <div className="border-t border-slate-100 px-4 py-5 text-center text-xs font-bold text-slate-400 sm:px-5">
        함께하는 모임을 확인하는 중이에요.
      </div>
    )
  }

  if (!meeting) {
    return (
      <section className="border-t border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[#5A45E8]">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[13px] font-black text-slate-900">친구와 출발지를 함께 입력할까요?</h2>
              <p className="mt-1 text-[11px] font-medium leading-5 text-slate-500">
                초대 링크를 보내면 로그인 없이 각자 출발지를 입력할 수 있어요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCreate}
            disabled={status === 'creating'}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#5A45E8] px-4 text-[11px] font-black text-white transition hover:bg-[#4D39D4] disabled:bg-violet-200"
          >
            <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
            {status === 'creating' ? '만드는 중...' : '함께 정하기'}
          </button>
        </div>
        {error ? <p className="mt-2 text-[10px] font-bold text-red-600">{error}</p> : null}
      </section>
    )
  }

  const participants = meeting.participants || []
  const canRecalculate = participants.length >= 2

  return (
    <section className="border-t border-slate-100 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[13px] font-black text-slate-900">
            <UsersRound className="h-4 w-4 text-[#5A45E8]" aria-hidden="true" />
            참여자 <span className="text-[#5A45E8]">{participants.length}/4명</span>
          </h2>
          <p className="mt-1 text-[10px] font-medium text-slate-500">참여자가 입력한 출발지는 방장만 자세히 볼 수 있어요.</p>
        </div>
        <button
          type="button"
          onClick={onCopyInvite}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 text-[11px] font-black text-[#5A45E8] transition hover:bg-violet-50"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          초대 링크 복사
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {participants.length ? participants.map((participant) => (
          <span
            key={participant.id}
            className="inline-flex min-w-0 items-center gap-1.5 rounded-xl bg-slate-50 py-1.5 pl-2.5 pr-1.5 text-[11px] font-bold text-slate-700"
          >
            <span className="max-w-40 truncate">{participant.nickname} · {participant.originName}</span>
            <button
              type="button"
              onClick={() => onRemoveParticipant(participant)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-300 transition hover:bg-red-50 hover:text-red-500"
              aria-label={`${participant.nickname} 참여자 제외`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        )) : (
          <p className="py-1 text-[11px] font-bold text-slate-400">초대 링크를 보내 첫 참여자를 불러보세요.</p>
        )}
      </div>

      <button
        type="button"
        onClick={onRecalculate}
        disabled={!canRecalculate || status === 'recalculating'}
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-4 text-xs font-black text-[#5A45E8] transition hover:bg-violet-100 disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        {!canRecalculate
          ? '2명 이상 참여하면 다시 추천할 수 있어요'
          : `${participants.length}명의 출발지로 다시 추천`}
      </button>
      {meeting.needsRecommendation && canRecalculate ? (
        <p className="mt-2 text-center text-[10px] font-bold text-[#6B56D9]">참여자 정보가 변경되어 다시 추천이 필요해요.</p>
      ) : null}
      {error ? <p className="mt-2 text-center text-[10px] font-bold text-red-600">{error}</p> : null}
    </section>
  )
}

function SavedMeetingDetail({
  meeting,
  scheduleText,
  statusLabel,
  statusClassName,
  sharing,
  error,
  collaborativeMeeting,
  collaborationStatus,
  collaborationError,
  onBack,
  onEdit,
  onReopen,
  onShare,
  onCreateCollaboration,
  onCopyInvite,
  onRecalculate,
  onRemoveParticipant,
}) {
  const stationQuery = encodeURIComponent(meeting.stationName)
  const kakaoMapUrl = `https://map.kakao.com/link/search/${stationQuery}`
  const naverMapUrl = `https://map.naver.com/p/search/${stationQuery}`
  const originsText = meeting.originNames.join(' · ')

  return (
    <section className="w-full max-w-[980px]">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-[#5A45E8]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.3} aria-hidden="true" />
        내 약속
      </button>

      <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(66,55,120,0.07)]">
        <header className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ring-inset ${statusClassName}`}>
                {statusLabel}
              </span>
              <h1 className="mt-2.5 truncate text-[24px] font-black tracking-[-0.04em] text-slate-950 sm:text-[28px]">
                {meeting.name}
              </h1>
              <p className="mt-1 text-[12px] font-bold text-slate-500">
                {scheduleText || '아직 약속 일정이 정해지지 않았어요.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[11px] font-black text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-[#5A45E8]"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              수정
            </button>
          </div>
        </header>

        {error ? (
          <p className="mx-4 mb-4 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold leading-5 text-red-600 sm:mx-6" role="alert">
            {error}
          </p>
        ) : null}

        <section className="border-t border-slate-100 px-4 py-5 sm:px-6">
          <p className="text-[10px] font-black tracking-[0.08em] text-[#6B56D9]">저장한 추천</p>
          <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-[13px] font-black text-slate-700 sm:text-[14px]">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="truncate">{originsText}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
              <strong className="shrink-0 text-[17px] text-slate-950">{meeting.stationName}</strong>
            </div>
          </div>

          {meeting.memo ? (
            <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] font-medium leading-5 text-slate-600">
              <strong className="mr-2 font-black text-slate-800">메모</strong>{meeting.memo}
            </div>
          ) : null}

          {SAVED_RESULT_MAP_LINKS_ENABLED ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <a
                href={kakaoMapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#FEE500] px-3.5 text-[11px] font-black text-slate-900 transition hover:brightness-95"
              >
                카카오맵 <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <a
                href={naverMapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#03C75A] px-3.5 text-[11px] font-black text-white transition hover:brightness-95"
              >
                네이버지도 <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          ) : null}
        </section>

        {COLLABORATIVE_MEETINGS_ENABLED ? (
          <CollaborationPanel
            meeting={collaborativeMeeting}
            status={collaborationStatus}
            error={collaborationError}
            onCreate={onCreateCollaboration}
            onCopyInvite={onCopyInvite}
            onRecalculate={onRecalculate}
            onRemoveParticipant={onRemoveParticipant}
          />
        ) : null}

        <footer className="grid gap-2 border-t border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5">
          <button
            type="button"
            onClick={onReopen}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5A45E8] px-5 text-xs font-black text-white shadow-[0_7px_18px_rgba(90,69,232,0.16)] transition hover:bg-[#4D39D4]"
          >
            추천 결과 다시보기
            <ArrowRight className="h-4 w-4" strokeWidth={2.3} aria-hidden="true" />
          </button>
          {SAVED_RESULT_SHARING_ENABLED ? (
            <button
              type="button"
              onClick={onShare}
              disabled={sharing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-5 text-xs font-black text-[#5A45E8] transition hover:bg-violet-50 disabled:text-violet-300"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {sharing ? '공유 준비 중' : '결과 공유'}
            </button>
          ) : null}
        </footer>
      </div>
    </section>
  )
}

export default SavedMeetingDetail
