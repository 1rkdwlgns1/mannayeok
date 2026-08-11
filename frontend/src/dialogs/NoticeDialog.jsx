import { useEffect, useState } from 'react'
import { ChevronDown, CircleHelp, X } from 'lucide-react'
import { getPublishedNotices } from '../services/noticeApi'

function renderNoticeDetail(detail) {
  const colorClasses = {
    violet: 'font-bold text-[#5A45E8]',
    red: 'font-bold text-red-600',
    gray: 'text-slate-500',
    black: 'font-bold text-slate-950',
  }
  const pattern = /\[\[(violet|red|gray|black):([^\]]*?)\]\]/g
  const parts = []
  let lastIndex = 0
  let match

  while ((match = pattern.exec(detail)) !== null) {
    if (match.index > lastIndex) parts.push(detail.slice(lastIndex, match.index))
    parts.push(
      <span key={`${match.index}-${match[1]}`} className={colorClasses[match[1]]}>
        {match[2]}
      </span>,
    )
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < detail.length) parts.push(detail.slice(lastIndex))
  return parts.length > 0 ? parts : detail
}

const FALLBACK_NOTICE_ITEMS = [
  {
    id: 'transit-route-fix',
    title: '지하철 경로 조회 오류 조치 안내',
    date: '2026.08.03',
    dateTime: '2026-08-03',
    status: '조치 완료',
    statusClass: 'bg-emerald-50 text-emerald-600',
    summary: '일부 구간에서 지하철 이동시간이 ‘확인 불가’로 표시되는 오류를 조치했습니다.',
    details: [
      '공공데이터 조회 과정의 형식 오류를 확인했습니다.',
      '공식 역 코드를 기준으로 경로를 조회하도록 연결 방식을 개선했습니다.',
    ],
    note: '추천 알고리즘과 점수 계산식은 변경하지 않았습니다.',
  },
  {
    id: 'beta-service',
    title: '만나역 베타 서비스 이용 안내',
    date: '2026.08.01',
    dateTime: '2026-08-01',
    status: '안내',
    statusClass: 'bg-violet-50 text-[#5A45E8]',
    summary: '만나역은 더 편리하고 정확한 약속역 추천을 위해 베타 서비스로 운영되고 있습니다.',
    details: [
      '서비스 이용 중 일부 기능과 화면이 변경될 수 있습니다.',
      '발견된 오류와 개선 의견은 순차적으로 서비스에 반영합니다.',
    ],
    note: '이용 중 불편한 점은 문의하기를 통해 알려주세요.',
  },
  {
    id: 'supported-area',
    title: '현재 지원 지역 안내',
    date: '2026.08.01',
    dateTime: '2026-08-01',
    status: '안내',
    statusClass: 'bg-violet-50 text-[#5A45E8]',
    summary: '현재 만나역은 수도권 전철망을 이용할 수 있는 지역의 출발지와 역 추천을 지원합니다.',
    details: [
      '수도권 전철역과 주변 지역을 기준으로 검색할 수 있습니다.',
      '제주도·울릉도·독도는 현재 출발지 검색을 지원하지 않습니다.',
    ],
    note: '지원 범위는 데이터 제공 상황과 안정성을 확인하며 확대할 예정입니다.',
  },
]

function NoticeDialog({ onClose }) {
  const [openNoticeId, setOpenNoticeId] = useState(null)
  const [notices, setNotices] = useState(FALLBACK_NOTICE_ITEMS)
  const [noticeLoadError, setNoticeLoadError] = useState('')

  useEffect(() => {
    let active = true
    getPublishedNotices()
      .then((items) => {
        if (!active || !Array.isArray(items)) return
        setNotices(items.map((notice) => ({
          ...notice,
          date: notice.publishedAt
            ? new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
              .format(new Date(notice.publishedAt))
              .replaceAll(' ', '')
              .replace(/\.$/, '')
            : '',
          dateTime: notice.publishedAt?.slice(0, 10) || '',
        })))
        setNoticeLoadError('')
      })
      .catch(() => {
        if (active) setNoticeLoadError('최신 공지를 불러오지 못해 저장된 안내를 보여드려요.')
      })
    return () => { active = false }
  }, [])

  const statusInfo = (notice) => {
    const statusMap = {
      INFO: { label: '안내', className: 'bg-violet-50 text-[#5A45E8]' },
      IN_PROGRESS: { label: '조치 중', className: 'bg-amber-50 text-amber-700' },
      RESOLVED: { label: '조치 완료', className: 'bg-emerald-50 text-emerald-600' },
      MAINTENANCE: { label: '점검 예정', className: 'bg-sky-50 text-sky-700' },
      IMPORTANT: { label: '중요', className: 'bg-red-50 text-red-600' },
    }
    return statusMap[notice.status] || {
      label: notice.status,
      className: notice.statusClass || 'bg-violet-50 text-[#5A45E8]',
    }
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-white/60 bg-white p-4 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black text-[#5A45E8]">만나역 소식</p>
            <h2 id="notice-title" className="mt-1 text-lg font-black tracking-tight text-slate-950 sm:text-xl">
              공지사항
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500 sm:text-[13px]">
              새로운 소식과 이용 안내를 확인해 주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="공지사항 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {noticeLoadError ? <p className="mt-3 text-[11px] font-semibold text-amber-600">{noticeLoadError}</p> : null}

        <div className="mt-4 space-y-2.5">
          {notices.map((notice) => {
            const isOpen = openNoticeId === notice.id
            const contentId = `notice-content-${notice.id}`
            const status = statusInfo(notice)

            return (
              <article key={notice.id} className={`overflow-hidden rounded-xl border bg-white transition ${isOpen ? 'border-violet-200' : 'border-slate-200 hover:border-violet-200'}`}>
                <button
                  type="button"
                  onClick={() => setOpenNoticeId(isOpen ? null : notice.id)}
                  className="flex min-h-14 w-full items-center gap-3 px-3.5 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300 sm:px-4 sm:py-3.5"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-black text-slate-900 sm:text-sm">
                      {notice.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <time dateTime={notice.dateTime} className="text-[11px] font-semibold text-slate-400">
                        {notice.date}
                      </time>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${status.className}`}>
                        {status.label}
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#5A45E8]' : ''}`}
                    strokeWidth={2.3}
                    aria-hidden="true"
                  />
                </button>

                <div
                  id={contentId}
                  className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden">
                    <div className="mx-3.5 border-t border-slate-200/80 py-3.5 sm:mx-4">
                      <p className="break-keep text-xs font-bold leading-5 text-slate-700 sm:text-[13px] sm:leading-6">
                        {notice.summary}
                      </p>

                      <ul className="mt-3 space-y-2">
                        {notice.details.map((detail, index) => (
                          <li key={`${notice.id}-${index}`} className="text-[11px] font-medium leading-5 text-slate-600 sm:text-xs">
                            {renderNoticeDetail(detail)}
                          </li>
                        ))}
                      </ul>

                      {notice.note ? (
                        <p className="mt-3 flex items-start gap-2 text-[11px] font-semibold leading-5 text-slate-500 sm:text-xs">
                          <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2.2} aria-hidden="true" />
                          <span>{notice.note}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-10 w-full rounded-xl bg-[#5A45E8] text-sm font-black text-white transition hover:bg-[#4D39D4] active:scale-[0.99] sm:h-11"
        >
          닫기
        </button>
      </section>
    </div>
  )
}

export default NoticeDialog
