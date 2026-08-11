import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CalendarHeart,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  EllipsisVertical,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import AuthLayout from '../auth/AuthLayout.jsx'
import TimeWheelPicker from '../TimeWheelPicker.jsx'
import { getStoredMember } from '../../services/authStorage.js'
import {
  deleteSavedRecommendation,
  getSavedRecommendations,
  updateSavedRecommendation,
} from '../../services/savedRecommendationApi.js'

const RESTORE_KEY = 'mannayeok.savedRecommendationRestore'
const CURRENT_YEAR = new Date().getFullYear()
const MEETINGS_PER_PAGE = 6
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function EditingCalendar({ selectedMonth, selectedDay, viewMonth, onChangeViewMonth, onSelect, onClose, popoverRef, popoverPosition }) {
  const firstWeekday = new Date(CURRENT_YEAR, viewMonth - 1, 1).getDay()
  const daysInMonth = new Date(CURRENT_YEAR, viewMonth, 0).getDate()
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  return (
    <div
      ref={popoverRef}
      style={{ ...popoverPosition, visibility: popoverPosition ? 'visible' : 'hidden' }}
      className="fixed z-[70] max-h-[calc(100dvh-1rem)] w-[min(290px,calc(100vw-3rem))] overflow-y-auto rounded-2xl border border-violet-100 bg-white p-4 shadow-[0_20px_50px_rgba(45,35,100,0.2)]"
      role="dialog"
      aria-label="수정할 약속 날짜 선택"
    >
      <div className="flex items-center justify-between gap-3">
        <strong className="text-sm font-black text-slate-950">{CURRENT_YEAR}년 {viewMonth}월</strong>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onChangeViewMonth(Math.max(1, viewMonth - 1))} disabled={viewMonth === 1} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 disabled:opacity-25" aria-label="이전 달"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => onChangeViewMonth(Math.min(12, viewMonth + 1))} disabled={viewMonth === 12} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 disabled:opacity-25" aria-label="다음 달"><ChevronRight className="h-4 w-4" /></button>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="달력 닫기"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center">
        {WEEKDAYS.map((weekday, index) => <span key={weekday} className={`py-1 text-[10px] font-black ${index === 0 ? 'text-rose-400' : index === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{weekday}</span>)}
        {cells.map((day, index) => day ? (
          <button key={`${viewMonth}-${day}`} type="button" onClick={() => onSelect(viewMonth, day)} className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${Number(selectedMonth) === viewMonth && Number(selectedDay) === day ? 'bg-[#5A45E8] text-white' : 'text-slate-700 hover:bg-violet-50'}`}>{day}</button>
        ) : <span key={`empty-${index}`} className="h-9" />)}
      </div>
    </div>
  )
}

function getAnchoredPopoverPosition(anchorElement, popoverElement) {
  const viewportMargin = 8
  const gap = 8
  const anchorRect = anchorElement.getBoundingClientRect()
  const popoverRect = popoverElement.getBoundingClientRect()
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = window.innerHeight
  const spaceAbove = anchorRect.top - viewportMargin - gap
  const spaceBelow = viewportHeight - anchorRect.bottom - viewportMargin - gap

  let top
  if (spaceBelow >= popoverRect.height) {
    top = anchorRect.bottom + gap
  } else if (spaceAbove >= popoverRect.height) {
    top = anchorRect.top - popoverRect.height - gap
  } else {
    top = Math.max(viewportMargin, Math.min(anchorRect.bottom + gap, viewportHeight - popoverRect.height - viewportMargin))
  }

  const rightAlignedLeft = anchorRect.right - popoverRect.width
  const left = Math.max(viewportMargin, Math.min(rightAlignedLeft, viewportWidth - popoverRect.width - viewportMargin))

  return { left, top }
}

function getEditableSchedule(meeting) {
  const [, month = '', day = ''] = (meeting.meetingDate || '').split('-')
  const [hourText = '', minute = ''] = (meeting.meetingTime || '').slice(0, 5).split(':')
  const hour = Number(hourText)

  return {
    month,
    day,
    period: meeting.meetingTime ? (hour < 12 ? '오전' : '오후') : '오후',
    hour: meeting.meetingTime ? String(hour % 12 || 12) : '',
    minute,
  }
}

function buildEditedSchedule(monthText, dayText, period, hourText, minuteText) {
  const hasDate = Boolean(monthText || dayText)
  const hasTime = Boolean(hourText || minuteText)
  let meetingDate = null
  let meetingTime = null

  if (hasDate) {
    const month = Number(monthText)
    const day = Number(dayText)
    const date = new Date(CURRENT_YEAR, month - 1, day)
    if (!monthText || !dayText || date.getFullYear() !== CURRENT_YEAR || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return { valid: false, message: '날짜를 다시 확인해 주세요.' }
    }
    meetingDate = `${CURRENT_YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  if (hasTime) {
    const hour = Number(hourText)
    const normalizedMinuteText = hourText && !minuteText ? '00' : minuteText
    const minute = Number(normalizedMinuteText)
    if (!hourText || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      return { valid: false, message: '시간을 다시 확인해 주세요.' }
    }
    const hour24 = period === '오전' ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12)
    meetingTime = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  return { valid: true, meetingDate, meetingTime }
}

function formatMeetingDate(value, includeWeekday = false) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    ...(includeWeekday ? { weekday: 'short' } : {}),
  }).format(date)
}

function formatMeetingTime(value) {
  if (!value) return ''
  const [hourText, minute = '00'] = value.split(':')
  const hour = Number(hourText)
  if (!Number.isFinite(hour)) return ''
  const period = hour < 12 ? '오전' : '오후'
  const displayHour = hour % 12 || 12
  return `${period} ${displayHour}:${minute}`
}

function getScheduleText(meeting) {
  return [
    formatMeetingDate(meeting.meetingDate, true),
    formatMeetingTime(meeting.meetingTime),
  ].filter(Boolean).join(' · ')
}

function getTodayKey() {
  const today = new Date()
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
}

function getMeetingStatus(meeting, todayKey) {
  if (!meeting.meetingDate) return 'undated'
  return meeting.meetingDate < todayKey ? 'past' : 'upcoming'
}

function getScheduleDisplay(meeting, todayKey) {
  if (!meeting.meetingDate) return { label: '일정 미정', tone: 'undated' }

  const meetingDate = new Date(`${meeting.meetingDate}T00:00:00`)
  const today = new Date(`${todayKey}T00:00:00`)
  const daysUntil = Math.round((meetingDate.getTime() - today.getTime()) / 86400000)
  const detail = getScheduleText(meeting)

  if (daysUntil < 0) return { label: `지난 모임 · ${detail}`, tone: 'past' }
  if (daysUntil === 0) return { label: `오늘${meeting.meetingTime ? ` · ${formatMeetingTime(meeting.meetingTime)}` : ''}`, tone: 'today' }
  if (daysUntil === 1) return { label: `내일${meeting.meetingTime ? ` · ${formatMeetingTime(meeting.meetingTime)}` : ''}`, tone: 'today' }
  return { label: `D-${daysUntil} · ${detail}`, tone: 'upcoming' }
}

const STATUS_META = {
  upcoming: { label: '예정', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  undated: { label: '일정 미정', className: 'bg-violet-50 text-[#5A45E8] ring-violet-100' },
  past: { label: '지난 모임', className: 'bg-slate-100 text-slate-500 ring-slate-200' },
  today: { label: '오늘', className: 'bg-rose-50 text-rose-600 ring-rose-100' },
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-black transition sm:px-3 sm:text-[11px] ${active ? 'bg-[#5A45E8] text-white shadow-sm' : 'text-slate-500 hover:bg-violet-50 hover:text-[#5A45E8]'}`}
    >
      {children}
    </button>
  )
}

function SavedMeetingsPage() {
  const member = getStoredMember()
  const memberKey = member?.id ?? member?.email ?? null
  const [meetings, setMeetings] = useState([])
  const [loadStatus, setLoadStatus] = useState('loading')
  const [pageError, setPageError] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editingMemo, setEditingMemo] = useState('')
  const [editingDateMonth, setEditingDateMonth] = useState('')
  const [editingDateDay, setEditingDateDay] = useState('')
  const [editingTimePeriod, setEditingTimePeriod] = useState('오후')
  const [editingTimeHour, setEditingTimeHour] = useState('')
  const [editingTimeMinute, setEditingTimeMinute] = useState('')
  const [editingCalendarOpen, setEditingCalendarOpen] = useState(false)
  const [editingCalendarViewMonth, setEditingCalendarViewMonth] = useState(new Date().getMonth() + 1)
  const [editingTimePickerOpen, setEditingTimePickerOpen] = useState(false)
  const [editingScheduleUndecided, setEditingScheduleUndecided] = useState(true)
  const [editingScheduleError, setEditingScheduleError] = useState('')
  const [actionStatus, setActionStatus] = useState('idle')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [notice, setNotice] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMeetingId, setSelectedMeetingId] = useState(null)
  const menuRootRef = useRef(null)
  const editingCalendarRootRef = useRef(null)
  const editingTimePickerRootRef = useRef(null)
  const editingNameInputRef = useRef(null)
  const editingCalendarPopoverRef = useRef(null)
  const editingTimePickerPopoverRef = useRef(null)
  const [editingCalendarPosition, setEditingCalendarPosition] = useState(null)
  const [editingTimePickerPosition, setEditingTimePickerPosition] = useState(null)

  useEffect(() => {
    if (!memberKey) return undefined
    let active = true
    getSavedRecommendations()
      .then((items) => {
        if (!active) return
        setMeetings(items)
        setLoadStatus('ready')
      })
      .catch((error) => {
        if (!active) return
        if (error?.status === 401) {
          window.location.replace('/login')
          return
        }
        setPageError(error instanceof Error ? error.message : '내 약속을 불러오지 못했어요.')
        setLoadStatus('error')
      })
    return () => {
      active = false
    }
  }, [memberKey])

  useEffect(() => {
    if (!menuOpenId) return undefined
    const closeMenu = (event) => {
      if (!menuRootRef.current?.contains(event.target)) setMenuOpenId(null)
    }
    window.addEventListener('pointerdown', closeMenu)
    return () => window.removeEventListener('pointerdown', closeMenu)
  }, [menuOpenId])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!editingCalendarOpen && !editingTimePickerOpen) return undefined
    const closePickers = (event) => {
      if (
        !editingCalendarRootRef.current?.contains(event.target)
        && !editingTimePickerRootRef.current?.contains(event.target)
      ) {
        setEditingCalendarOpen(false)
        setEditingTimePickerOpen(false)
      }
    }
    window.addEventListener('pointerdown', closePickers)
    return () => window.removeEventListener('pointerdown', closePickers)
  }, [editingCalendarOpen, editingTimePickerOpen])

  useLayoutEffect(() => {
    if (!editingCalendarOpen) return undefined

    const updatePosition = () => {
      if (!editingCalendarRootRef.current || !editingCalendarPopoverRef.current) return
      setEditingCalendarPosition(getAnchoredPopoverPosition(editingCalendarRootRef.current, editingCalendarPopoverRef.current))
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [editingCalendarOpen, editingCalendarViewMonth, editingId])

  useLayoutEffect(() => {
    if (!editingTimePickerOpen) return undefined

    const updatePosition = () => {
      if (!editingTimePickerRootRef.current || !editingTimePickerPopoverRef.current) return
      setEditingTimePickerPosition(getAnchoredPopoverPosition(editingTimePickerRootRef.current, editingTimePickerPopoverRef.current))
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [editingTimePickerOpen, editingId])

  useEffect(() => {
    if (!editingId || !window.matchMedia('(min-width: 640px)').matches) return undefined
    const frame = window.requestAnimationFrame(() => editingNameInputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [editingId])

  if (!member) {
    window.location.replace('/login')
    return null
  }

  const todayKey = getTodayKey()
  const meetingCounts = meetings.reduce((counts, meeting) => {
    const status = getMeetingStatus(meeting, todayKey)
    counts[status] += 1
    return counts
  }, { upcoming: 0, undated: 0, past: 0 })
  const visibleMeetings = activeFilter === 'all'
    ? meetings
    : meetings.filter((meeting) => getMeetingStatus(meeting, todayKey) === activeFilter)
  const totalPages = Math.ceil(visibleMeetings.length / MEETINGS_PER_PAGE)
  const activePage = Math.min(currentPage, Math.max(1, totalPages))
  const pagedMeetings = visibleMeetings.slice(
    (activePage - 1) * MEETINGS_PER_PAGE,
    activePage * MEETINGS_PER_PAGE,
  )
  const selectFilter = (filter) => {
    setActiveFilter(filter)
    setCurrentPage(1)
  }

  const openMeetingDetail = (meeting) => {
    setSelectedMeetingId((currentId) => currentId === String(meeting.id) ? null : String(meeting.id))
  }

  const beginEdit = (meeting) => {
    const schedule = getEditableSchedule(meeting)
    setMenuOpenId(null)
    setEditingId(meeting.id)
    setEditingName(meeting.name)
    setEditingMemo((meeting.memo || '').slice(0, 100))
    setEditingDateMonth(schedule.month)
    setEditingDateDay(schedule.day)
    setEditingTimePeriod(schedule.period)
    setEditingTimeHour(schedule.hour)
    setEditingTimeMinute(schedule.minute)
    setEditingCalendarViewMonth(Number(schedule.month) || new Date().getMonth() + 1)
    setEditingCalendarOpen(false)
    setEditingTimePickerOpen(false)
    setEditingScheduleUndecided(!schedule.month && !schedule.hour)
    setEditingScheduleError('')
    setPageError('')
  }

  const cancelEdit = () => {
    if (actionStatus === 'loading') return
    setEditingId(null)
    setEditingName('')
    setEditingMemo('')
    setEditingDateMonth('')
    setEditingDateDay('')
    setEditingTimePeriod('오후')
    setEditingTimeHour('')
    setEditingTimeMinute('')
    setEditingCalendarOpen(false)
    setEditingTimePickerOpen(false)
    setEditingScheduleUndecided(true)
    setEditingScheduleError('')
    setPageError('')
  }

  const clearEditingSchedule = () => {
    setEditingDateMonth('')
    setEditingDateDay('')
    setEditingTimePeriod('오후')
    setEditingTimeHour('')
    setEditingTimeMinute('')
    setEditingCalendarOpen(false)
    setEditingTimePickerOpen(false)
    setEditingScheduleUndecided(true)
    setEditingScheduleError('')
  }

  const selectEditingDate = (month, day) => {
    setEditingDateMonth(String(month).padStart(2, '0'))
    setEditingDateDay(String(day).padStart(2, '0'))
    setEditingCalendarViewMonth(month)
    setEditingCalendarOpen(false)
    setEditingScheduleUndecided(false)
    setEditingScheduleError('')
  }

  const completeEditingTime = () => {
    if (editingTimeHour && !editingTimeMinute) setEditingTimeMinute('00')
    setEditingTimePickerOpen(false)
  }

  const saveEdit = async (id) => {
    const nextName = editingName.trim()
    if (!nextName || actionStatus === 'loading') return
    const schedule = buildEditedSchedule(
      editingDateMonth,
      editingDateDay,
      editingTimePeriod,
      editingTimeHour,
      editingTimeMinute,
    )
    if (!schedule.valid) {
      setEditingScheduleError(schedule.message)
      return
    }
    setActionStatus('loading')
    setEditingScheduleError('')
    setPageError('')
    try {
      const updated = await updateSavedRecommendation(id, {
        name: nextName,
        memo: editingMemo.trim() || null,
        meetingDate: schedule.meetingDate,
        meetingTime: schedule.meetingTime,
      })
      const refreshed = await getSavedRecommendations().catch(() => null)
      setMeetings((items) => refreshed || items.map((item) => item.id === id ? updated : item))
      setEditingId(null)
      setNotice('모임 정보가 수정됐어요.')
    } catch (error) {
      setPageError(error instanceof Error ? error.message : '모임을 수정하지 못했어요.')
    } finally {
      setActionStatus('idle')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget || actionStatus === 'loading') return
    setActionStatus('loading')
    setPageError('')
    try {
      await deleteSavedRecommendation(deleteTarget.id)
      setMeetings((items) => items.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
      setNotice('내 약속에서 삭제했어요.')
    } catch (error) {
      setPageError(error instanceof Error ? error.message : '모임을 삭제하지 못했어요.')
      setDeleteTarget(null)
    } finally {
      setActionStatus('idle')
    }
  }

  const reopenMeeting = (meeting) => {
    window.sessionStorage.setItem(RESTORE_KEY, JSON.stringify({
      type: meeting.resultType,
      payload: meeting.payload,
    }))
    window.location.assign('/')
  }

  const startNewMeeting = () => {
    window.sessionStorage.removeItem(RESTORE_KEY)
    window.location.assign('/')
  }

  return (
    <AuthLayout backTo="/" backLabel="메인 화면으로 돌아가기" dashboard compactFooter topAligned>
      <section className="w-full max-w-[980px]">
        <header className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black tracking-[0.12em] text-[#5A45E8]">MY PLANS</p>
            <h1 className="mt-1 text-[22px] font-black tracking-[-0.04em] text-slate-950 sm:text-[30px]">내 약속</h1>
            <p className="mt-1 text-xs font-medium text-slate-500">저장해둔 추천 결과와 약속 일정을 한눈에 확인해보세요.</p>
          </div>
          <button type="button" onClick={startNewMeeting} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#5A45E8] px-4 text-xs font-black text-white shadow-[0_7px_16px_rgba(90,69,232,0.16)] transition hover:bg-[#4D39D4]">
            <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />새 약속 찾기
          </button>
        </header>

        <div className="mt-3 flex gap-1 overflow-x-auto rounded-xl border border-violet-100 bg-white p-1 shadow-sm" role="tablist" aria-label="내 약속 필터">
          <FilterButton active={activeFilter === 'all'} onClick={() => selectFilter('all')}>전체 {meetings.length}</FilterButton>
          <FilterButton active={activeFilter === 'upcoming'} onClick={() => selectFilter('upcoming')}>예정 {meetingCounts.upcoming}</FilterButton>
          <FilterButton active={activeFilter === 'undated'} onClick={() => selectFilter('undated')}>미정 {meetingCounts.undated}</FilterButton>
          {meetingCounts.past > 0 ? <FilterButton active={activeFilter === 'past'} onClick={() => selectFilter('past')}>지난 약속 {meetingCounts.past}</FilterButton> : null}
        </div>

        {pageError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold leading-5 text-red-600" role="alert">{pageError}</p> : null}

        {loadStatus === 'loading' ? (
          <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-4 py-12 text-center text-xs font-bold text-slate-500 shadow-sm">내 약속을 불러오는 중...</div>
        ) : meetings.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-violet-200 bg-white px-5 py-12 text-center shadow-sm">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-[#5A45E8]"><CalendarHeart className="h-5 w-5" aria-hidden="true" /></span>
            <h2 className="mt-3 text-[15px] font-black text-slate-900">아직 저장한 약속이 없어요</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">추천 결과를 저장하면 메모처럼 다시 꺼내볼 수 있어요.</p>
            <button type="button" onClick={startNewMeeting} className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#5A45E8] px-4 text-xs font-black text-white">약속역 찾기<ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
        ) : visibleMeetings.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-violet-200 bg-white px-5 py-10 text-center shadow-sm">
            <CalendarDays className="mx-auto h-6 w-6 text-violet-300" aria-hidden="true" />
            <p className="mt-2 text-[13px] font-black text-slate-700">이 조건에 해당하는 약속이 없어요.</p>
            <button type="button" onClick={() => selectFilter('all')} className="mt-3 text-xs font-black text-[#5A45E8] hover:underline">전체 약속 보기</button>
          </div>
        ) : (
          <div className="mt-2 overflow-visible rounded-2xl border border-slate-100 bg-white shadow-[0_12px_36px_rgba(58,45,125,0.06)]">
            {pagedMeetings.map((meeting, index) => {
              const isEditing = editingId === meeting.id
              const isExpanded = selectedMeetingId === String(meeting.id)
              const status = getMeetingStatus(meeting, todayKey)
              const scheduleDisplay = getScheduleDisplay(meeting, todayKey)
              const statusMeta = STATUS_META[scheduleDisplay.tone] || STATUS_META[status]
              const compactStatus = scheduleDisplay.label.split(' · ')[0]

              return (
                <article key={meeting.id} className={`relative ${index ? 'border-t border-slate-100' : ''}`}>
                  {isEditing ? (
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[13px] font-black text-slate-900">메모·일정 수정</p>
                        <button type="button" onClick={cancelEdit} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="수정 취소"><X className="h-4 w-4" /></button>
                      </div>

                      <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_150px]">
                        <input
                          ref={editingNameInputRef}
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value.slice(0, 60))}
                          className="h-10 min-w-0 rounded-xl border border-slate-200 px-3 text-xs font-semibold outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:h-11 sm:font-bold"
                          aria-label="메모 제목"
                        />

                        <div ref={editingCalendarRootRef} className="relative min-w-0">
                          <button type="button" onClick={() => { setEditingTimePickerOpen(false); setEditingCalendarOpen((open) => !open) }} className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left transition hover:border-violet-200 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100 sm:h-11" aria-label="수정할 약속 날짜 선택" aria-expanded={editingCalendarOpen}>
                            <CalendarDays className="h-4 w-4 shrink-0 text-[#5A45E8]" aria-hidden="true" />
                            <span className={`min-w-0 flex-1 truncate text-xs font-bold sm:font-black ${editingDateMonth && editingDateDay ? 'text-slate-800' : 'text-slate-400'}`}>
                              {editingDateMonth && editingDateDay ? `${CURRENT_YEAR}년 ${Number(editingDateMonth)}월 ${Number(editingDateDay)}일` : '날짜 선택'}
                            </span>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${editingCalendarOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                          </button>
                          {editingCalendarOpen ? (
                            <EditingCalendar
                              selectedMonth={editingDateMonth}
                              selectedDay={editingDateDay}
                              viewMonth={editingCalendarViewMonth}
                              onChangeViewMonth={setEditingCalendarViewMonth}
                              onSelect={selectEditingDate}
                              onClose={() => setEditingCalendarOpen(false)}
                              popoverRef={editingCalendarPopoverRef}
                              popoverPosition={editingCalendarPosition}
                            />
                          ) : null}
                        </div>

                        <div ref={editingTimePickerRootRef} className="relative min-w-0">
                          <button type="button" onClick={() => { setEditingCalendarOpen(false); setEditingTimePickerOpen((open) => !open) }} className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left transition hover:border-violet-200 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100 sm:h-11" aria-label="수정할 약속 시간 선택" aria-expanded={editingTimePickerOpen}>
                            <Clock3 className="h-4 w-4 shrink-0 text-[#5A45E8]" aria-hidden="true" />
                            <span className={`min-w-0 flex-1 truncate text-xs font-bold sm:font-black ${editingTimeHour ? 'text-slate-800' : 'text-slate-400'}`}>
                              {editingTimeHour ? `${editingTimePeriod} ${editingTimeHour}:${editingTimeMinute || '00'}` : '시간 선택'}
                            </span>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${editingTimePickerOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                          </button>
                          {editingTimePickerOpen ? (
                            <div
                              ref={editingTimePickerPopoverRef}
                              style={{ ...editingTimePickerPosition, visibility: editingTimePickerPosition ? 'visible' : 'hidden' }}
                              className="fixed z-[70] max-h-[calc(100dvh-1rem)] w-[min(286px,calc(100vw-3rem))] overflow-y-auto rounded-2xl border border-violet-100 bg-white p-3 shadow-[0_18px_45px_rgba(45,35,100,0.18)]"
                            >
                              <TimeWheelPicker
                                period={editingTimePeriod}
                                hour={editingTimeHour}
                                minute={editingTimeMinute}
                                onChangePeriod={(value) => { setEditingTimePeriod(value); setEditingScheduleUndecided(false); setEditingScheduleError('') }}
                                onChangeHour={(value) => { setEditingTimeHour(value); if (!editingTimeMinute) setEditingTimeMinute('00'); setEditingScheduleUndecided(false); setEditingScheduleError('') }}
                                onChangeMinute={(value) => { setEditingTimeMinute(value); setEditingScheduleUndecided(false); setEditingScheduleError('') }}
                                onComplete={completeEditingTime}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <textarea
                        value={editingMemo}
                        onChange={(event) => setEditingMemo(event.target.value.slice(0, 100))}
                        maxLength={100}
                        rows={2}
                        placeholder="기억해둘 내용을 메모해보세요."
                        className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-medium leading-5 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:py-2.5 sm:font-semibold"
                        aria-label="메모"
                      />

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-h-5">
                          {editingScheduleError ? <p className="text-[11px] font-bold text-red-600 sm:text-[10px]">{editingScheduleError}</p> : (
                            <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-bold text-slate-500 sm:text-[10px]">
                              <input type="checkbox" checked={editingScheduleUndecided} onChange={(event) => event.target.checked ? clearEditingSchedule() : setEditingScheduleUndecided(false)} className="h-3.5 w-3.5 accent-[#5A45E8]" />
                              아직 일정을 정하지 않았어요.
                            </label>
                          )}
                        </div>
                        <button type="button" onClick={() => saveEdit(meeting.id)} disabled={!editingName.trim() || actionStatus === 'loading'} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#5A45E8] px-5 text-xs font-black text-white shadow-[0_6px_14px_rgba(90,69,232,0.14)] disabled:bg-violet-200"><Check className="h-3.5 w-3.5" />{actionStatus === 'loading' ? '저장 중' : '저장'}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="group flex items-stretch">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.matchMedia('(max-width: 767px)').matches) openMeetingDetail(meeting)
                        }}
                        className="grid min-w-0 flex-1 grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left transition hover:bg-violet-50/35 sm:px-5 md:grid-cols-[64px_minmax(0,1fr)_minmax(120px,220px)] md:gap-4 md:pointer-events-none md:cursor-default md:hover:bg-transparent"
                      >
                        <span className={`inline-flex min-h-9 items-center justify-center rounded-lg px-2 text-center text-[9px] font-black leading-4 ring-1 ring-inset ${statusMeta.className}`}>{compactStatus}</span>
                        <span className="min-w-0">
                          <strong className="block truncate text-[14px] font-black tracking-[-0.02em] text-slate-950 sm:text-base">{meeting.name}</strong>
                          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-slate-500 sm:text-[11px]"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{meeting.originNames.join(' · ')}</span><ArrowRight className="h-3 w-3 shrink-0 text-slate-300" /><strong className="shrink-0 text-[#5A45E8]">{meeting.stationName}</strong></span>
                          <span className="mt-1.5 flex min-w-0 items-center gap-1 text-[10px] sm:text-[11px]">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#6548E8]" aria-hidden="true" />
                            <strong className="shrink-0 font-black text-[#6548E8]">약속 일정 :</strong>
                            <span className="truncate font-bold text-slate-600">{getScheduleText(meeting) || '미정'}</span>
                          </span>
                          {meeting.memo ? (
                            <span className="mt-1 flex min-w-0 items-center gap-1 text-[10px] md:hidden">
                              <strong className="shrink-0 font-black text-[#6F91D8]">메모 :</strong>
                              <span className="truncate font-medium text-slate-600">{meeting.memo}</span>
                            </span>
                          ) : null}
                        </span>
                        {meeting.memo ? (
                          <span className="hidden min-w-0 items-center justify-end gap-1 text-[11px] leading-5 md:flex lg:text-xs">
                            <strong className="shrink-0 font-black text-[#6F91D8]">메모 :</strong>
                            <span className="truncate font-medium text-slate-600">{meeting.memo}</span>
                          </span>
                        ) : <span className="hidden md:block" />}
                        <ChevronRight className={`h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-[#5A45E8] md:hidden ${isExpanded ? 'rotate-90 text-[#5A45E8]' : 'group-hover:translate-x-0.5'}`} aria-hidden="true" />
                      </button>

                      <span className="my-auto hidden h-7 w-px shrink-0 bg-slate-200 md:block" aria-hidden="true" />

                      <button
                        type="button"
                        onClick={() => reopenMeeting(meeting)}
                        className="my-auto mr-2 hidden h-8 shrink-0 items-center gap-1 rounded-lg bg-[#5A45E8] px-3 text-[10px] font-black text-white transition hover:bg-[#4D39D4] md:inline-flex"
                      >
                        추천 결과 다시보기
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </button>

                      <div ref={menuOpenId === meeting.id ? menuRootRef : null} className="relative flex w-10 shrink-0 items-center justify-center pr-2 sm:w-12">
                        <button type="button" onClick={() => setMenuOpenId((id) => id === meeting.id ? null : meeting.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`${meeting.name} 메뉴`} aria-expanded={menuOpenId === meeting.id}><EllipsisVertical className="h-4 w-4" /></button>
                        {menuOpenId === meeting.id ? (
                          <div className="absolute right-2 top-[calc(50%+18px)] z-20 w-36 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl md:w-48 md:rounded-2xl md:p-2 md:shadow-[0_16px_36px_rgba(30,24,70,0.16)]">
                            <button type="button" onClick={() => beginEdit(meeting)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold text-slate-700 hover:bg-violet-50 hover:text-[#5A45E8] md:gap-2.5 md:px-3.5 md:py-3 md:text-sm"><Pencil className="h-3.5 w-3.5 shrink-0 md:h-[18px] md:w-[18px]" />메모·일정 수정</button>
                            <button type="button" onClick={() => { setMenuOpenId(null); setDeleteTarget(meeting) }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold text-red-600 hover:bg-red-50 md:gap-2.5 md:px-3.5 md:py-3 md:text-sm"><Trash2 className="h-3.5 w-3.5 shrink-0 md:h-[18px] md:w-[18px]" />삭제</button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                  {!isEditing ? (
                    <div
                      className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out md:hidden ${isExpanded ? 'grid-rows-[1fr] border-t border-violet-100 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="bg-violet-50/25 px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => reopenMeeting(meeting)}
                            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#5A45E8] px-3 text-[11px] font-black text-white active:bg-[#4D39D4]"
                          >
                            추천 결과 다시보기
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })}
            {totalPages > 1 ? (
              <nav className="flex items-center justify-center gap-1 border-t border-slate-100 px-3 py-2" aria-label="내 약속 페이지">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
                  disabled={activePage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-[#5A45E8] disabled:text-slate-200"
                  aria-label="이전 페이지"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    aria-current={activePage === page ? 'page' : undefined}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[11px] font-black transition ${activePage === page ? 'bg-[#5A45E8] text-white shadow-sm' : 'text-slate-500 hover:bg-violet-50 hover:text-[#5A45E8]'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(totalPages, activePage + 1))}
                  disabled={activePage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-[#5A45E8] disabled:text-slate-200"
                  aria-label="다음 페이지"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                </button>
              </nav>
            ) : null}
          </div>
        )}
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-3 backdrop-blur-[2px] sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && actionStatus !== 'loading') setDeleteTarget(null) }}>
          <section className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="delete-saved-meeting-title">
            <h2 id="delete-saved-meeting-title" className="text-base font-black text-slate-950">내 약속에서 삭제할까요?</h2>
            <p className="mt-1.5 break-keep text-xs font-medium leading-5 text-slate-500">‘{deleteTarget.name}’ 저장 정보가 삭제됩니다.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={actionStatus === 'loading'} className="h-10 rounded-xl border border-slate-200 text-xs font-black text-slate-600">취소</button>
              <button type="button" onClick={confirmDelete} disabled={actionStatus === 'loading'} className="h-10 rounded-xl bg-red-600 text-xs font-black text-white disabled:bg-red-200">{actionStatus === 'loading' ? '삭제 중...' : '삭제'}</button>
            </div>
          </section>
        </div>
      ) : null}

      {notice ? (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl" role="status">{notice}</div>
      ) : null}
    </AuthLayout>
  )
}

export default SavedMeetingsPage
