import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CalendarDays, CalendarHeart, ChevronDown, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react'
import AnimatedLoadingDots from '../components/AnimatedLoadingDots'
import TimeWheelPicker from '../components/TimeWheelPicker.jsx'

const CURRENT_YEAR = new Date().getFullYear()
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function MeetingCalendar({ selectedMonth, selectedDay, viewMonth, onChangeViewMonth, onSelect, onClose }) {
  const today = new Date()
  const firstWeekday = new Date(CURRENT_YEAR, viewMonth - 1, 1).getDay()
  const daysInMonth = new Date(CURRENT_YEAR, viewMonth, 0).getDate()
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  const selectToday = () => {
    onChangeViewMonth(today.getMonth() + 1)
    onSelect(today.getMonth() + 1, today.getDate())
  }

  return (
    <div className="absolute bottom-[calc(100%+10px)] left-0 z-40 w-[min(290px,calc(100vw-3rem))] rounded-2xl border border-violet-100 bg-white p-4 shadow-[0_20px_50px_rgba(45,35,100,0.2)]" role="dialog" aria-label="약속 날짜 선택 달력">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-sm font-black text-slate-950">{CURRENT_YEAR}년 {viewMonth}월</strong>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onChangeViewMonth(Math.max(1, viewMonth - 1))} disabled={viewMonth === 1} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-[#5A45E8] disabled:opacity-25" aria-label="이전 달"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => onChangeViewMonth(Math.min(12, viewMonth + 1))} disabled={viewMonth === 12} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-[#5A45E8] disabled:opacity-25" aria-label="다음 달"><ChevronRight className="h-4 w-4" /></button>
          <button type="button" onClick={onClose} className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="달력 닫기"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center">
        {WEEKDAYS.map((weekday, index) => <span key={weekday} className={`py-1 text-[10px] font-black ${index === 0 ? 'text-rose-400' : index === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{weekday}</span>)}
        {calendarCells.map((day, index) => day ? (
          <button
            key={`${viewMonth}-${day}`}
            type="button"
            onClick={() => onSelect(viewMonth, day)}
            className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${Number(selectedMonth) === viewMonth && Number(selectedDay) === day ? 'bg-[#5A45E8] text-white shadow-sm' : 'text-slate-700 hover:bg-violet-50 hover:text-[#5A45E8]'}`}
          >
            {day}
          </button>
        ) : <span key={`empty-${index}`} className="h-9" />)}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <button type="button" onClick={onClose} className="text-[11px] font-bold text-slate-400 hover:text-slate-700">닫기</button>
        <button type="button" onClick={selectToday} className="rounded-lg bg-violet-50 px-3 py-1.5 text-[11px] font-black text-[#5A45E8] hover:bg-violet-100">오늘</button>
      </div>
    </div>
  )
}

function parseMeetingDateInput(value) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined
  }
  return `${match[1]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseMeetingTimeInput(value) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^(?:(오전|오후)\s*)?(\d{1,2}):(\d{2})$/)
  if (!match) return undefined
  const period = match[1]
  let hour = Number(match[2])
  const minute = Number(match[3])
  if (minute > 59) return undefined
  if (period) {
    if (hour < 1 || hour > 12) return undefined
    if (period === '오전') hour = hour === 12 ? 0 : hour
    if (period === '오후') hour = hour === 12 ? 12 : hour + 12
  } else if (hour > 23) {
    return undefined
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function formatMeetingDateConfirmation(value) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

function formatMeetingTimeConfirmation(value) {
  const [hourText, minute = '00'] = value.split(':')
  const hour = Number(hourText)
  if (!Number.isFinite(hour)) return ''
  return `${hour < 12 ? '오전' : '오후'} ${hour % 12 || 12}:${minute}`
}

function SaveMeetingDialog({
  loggedIn,
  stationName,
  originNames,
  defaultName,
  saveStatus,
  saveError,
  onLogin,
  onSave,
  onClose,
}) {
  const suggestedName = defaultName || `${stationName} 약속`
  const [name, setName] = useState('')
  const [nameFocused, setNameFocused] = useState(false)
  const [memo, setMemo] = useState('')
  const [dateMonth, setDateMonth] = useState('')
  const [dateDay, setDateDay] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarViewMonth, setCalendarViewMonth] = useState(new Date().getMonth() + 1)
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [scheduleUndecided, setScheduleUndecided] = useState(true)
  const [timePeriod, setTimePeriod] = useState('오후')
  const [timeHour, setTimeHour] = useState('')
  const [timeMinute, setTimeMinute] = useState('')
  const [scheduleValidationAttempted, setScheduleValidationAttempted] = useState(false)
  const calendarRootRef = useRef(null)
  const timePickerRootRef = useRef(null)
  const trimmedName = name.trim()
  const finalName = trimmedName || suggestedName
  const hasDateInput = Boolean(dateMonth || dateDay)
  const hasTimeInput = Boolean(timeHour || timeMinute)
  const meetingDateInput = hasDateInput ? `${CURRENT_YEAR}-${dateMonth}-${dateDay}` : ''
  const meetingTimeInput = hasTimeInput ? `${timePeriod} ${timeHour}:${timeMinute}` : ''
  const parsedMeetingDate = parseMeetingDateInput(meetingDateInput)
  const parsedMeetingTime = parseMeetingTimeInput(meetingTimeInput)
  const dateInvalid = hasDateInput && parsedMeetingDate === undefined
  const timeInvalid = hasTimeInput && parsedMeetingTime === undefined
  const isSaving = saveStatus === 'loading'

  useEffect(() => {
    if (!calendarOpen && !timePickerOpen) return undefined
    const closeSchedulePickers = (event) => {
      if (
        !calendarRootRef.current?.contains(event.target)
        && !timePickerRootRef.current?.contains(event.target)
      ) {
        setCalendarOpen(false)
        setTimePickerOpen(false)
      }
    }
    window.addEventListener('pointerdown', closeSchedulePickers)
    return () => window.removeEventListener('pointerdown', closeSchedulePickers)
  }, [calendarOpen, timePickerOpen])

  const selectCalendarDate = (month, day) => {
    setDateMonth(String(month).padStart(2, '0'))
    setDateDay(String(day).padStart(2, '0'))
    setCalendarViewMonth(month)
    setCalendarOpen(false)
    setScheduleUndecided(false)
    setScheduleValidationAttempted(false)
  }

  const clearSchedule = () => {
    setDateMonth('')
    setDateDay('')
    setTimePeriod('오후')
    setTimeHour('')
    setTimeMinute('')
    setCalendarOpen(false)
    setTimePickerOpen(false)
    setScheduleUndecided(true)
    setScheduleValidationAttempted(false)
  }

  const completeTimeSelection = () => {
    if (timeHour && !timeMinute) setTimeMinute('00')
    setTimePickerOpen(false)
  }
  const submit = () => {
    if (!finalName || isSaving) return
    const nextMinute = timeHour && !timeMinute ? '00' : timeMinute
    const nextTimeInput = timeHour || nextMinute ? `${timePeriod} ${timeHour}:${nextMinute}` : ''
    const nextParsedTime = parseMeetingTimeInput(nextTimeInput)
    if (dateInvalid || nextParsedTime === undefined) {
      setScheduleValidationAttempted(true)
      return
    }
    if (nextMinute !== timeMinute) setTimeMinute(nextMinute)
    onSave({
      name: finalName,
      memo: memo.trim() || null,
      meetingDate: parsedMeetingDate,
      meetingTime: nextParsedTime,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/35 p-2 backdrop-blur-[2px] sm:p-3"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose()
      }}
    >
      <section
        className={`max-h-[calc(100dvh-1rem)] w-full overflow-visible rounded-[22px] border border-white/60 bg-white shadow-[0_28px_80px_rgba(30,24,70,0.22)] sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-[28px] ${loggedIn ? 'max-w-[620px]' : 'max-w-[460px]'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-meeting-title"
      >
        <div className={`flex items-start justify-between gap-3 px-4 pb-1 pt-4 ${loggedIn ? 'sm:px-7 sm:pb-2 sm:pt-6' : 'sm:px-6 sm:pt-6'}`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1EEFF] text-[#5A45E8] sm:h-10 sm:w-10">
                <CalendarHeart className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
              </span>
              <h2 id="save-meeting-title" className={`font-black tracking-[-0.04em] text-slate-950 ${loggedIn ? 'text-[19px] sm:text-[25px]' : 'text-[18px] sm:text-[24px]'}`}>
                {loggedIn ? '약속 저장' : '로그인하고 저장해요'}
              </h2>
            </div>
            <p className="mt-2 break-keep text-[11px] font-medium leading-4 text-slate-500 sm:mt-2.5 sm:text-[13px] sm:leading-5">
              {loggedIn
                ? '추천 결과를 메모처럼 간단히 저장해두세요.'
                : '추천 결과를 내 약속에서 언제든 다시 볼 수 있어요.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 sm:h-9 sm:w-9"
            aria-label="약속 저장창 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {loggedIn ? (
          <div className="px-4 pt-2.5 sm:px-7 sm:pt-4">
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-[0_4px_14px_rgba(71,57,137,0.04)] sm:px-4 sm:py-3">
              <p className="text-[11px] font-black tracking-[0.08em] text-[#7562DB] sm:text-xs">추천 경로</p>
              <div className="mt-1.5 flex min-w-0 items-center gap-2">
                <strong className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-700 sm:text-[13px]">{originNames.join(' · ')}</strong>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" strokeWidth={2.2} aria-hidden="true" />
                <strong className="max-w-[42%] shrink-0 truncate rounded-lg bg-[#F1EEFF] px-2.5 py-1.5 text-[13px] font-black text-[#5A45E8] sm:text-[15px]">{stationName}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 pt-5 sm:px-6">
            <div className="rounded-2xl border border-violet-100 bg-violet-50/45 p-4">
              <p className="text-[10px] font-black tracking-[0.08em] text-[#7562DB]">이번 추천</p>
              <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
                <strong className="min-w-0 truncate text-[13px] font-black text-slate-800">{originNames.join(' · ')}</strong>
                <ArrowRight className="h-4 w-4 shrink-0 text-violet-300" strokeWidth={2.2} aria-hidden="true" />
                <strong className="text-[17px] font-black text-[#5A45E8]">{stationName}</strong>
              </div>
              <p className="mt-3 border-t border-violet-100 pt-3 text-[10px] font-semibold leading-4 text-slate-500">
                로그인하면 저장한 추천을 같은 계정에서 계속 확인할 수 있어요.
              </p>
            </div>
          </div>
        )}

        {loggedIn ? (
          <div className="px-4 pb-0 pt-3 sm:px-7 sm:pb-1 sm:pt-4">
            <label htmlFor="saved-meeting-name" className="text-[12px] font-black text-slate-700">
              제목
            </label>
            <input
              id="saved-meeting-name"
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 60))}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit()
              }}
              placeholder={nameFocused ? '' : suggestedName}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base font-bold text-slate-900 outline-none transition placeholder:font-semibold placeholder:text-slate-300 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:mt-2 sm:h-11 sm:text-[13px]"
            />

            <label htmlFor="saved-meeting-memo" className="mt-2.5 block text-[12px] font-black text-slate-700 sm:mt-3.5">
              메모 <span className="text-[10px] font-bold text-[#8A76EF]">(선택)</span>
            </label>
            <textarea
              id="saved-meeting-memo"
              value={memo}
              onChange={(event) => setMemo(event.target.value.slice(0, 100))}
              maxLength={100}
              rows={2}
              placeholder="만날 장소나 기억해둘 내용을 적어보세요."
              className="mt-1.5 h-[58px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-base font-semibold leading-5 text-slate-800 outline-none transition placeholder:text-xs placeholder:text-slate-300 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:mt-2 sm:h-auto sm:py-2.5 sm:text-[12px]"
            />
            {memo.length ? <p className="mt-1 text-right text-[10px] font-semibold text-slate-400">{memo.length}/100</p> : null}

            <div className="mt-2.5 flex items-center gap-1.5 sm:mt-3.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-700">약속 일정</span>
                <span className="text-[10px] font-bold text-[#8A76EF]">(선택)</span>
              </div>
            </div>
            <div className="mt-1.5 grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-2 sm:mt-2 sm:gap-2.5">
              <div ref={calendarRootRef} className="relative min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setTimePickerOpen(false)
                    setCalendarViewMonth(Number(dateMonth) || new Date().getMonth() + 1)
                    setCalendarOpen((open) => !open)
                  }}
                  className="flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left transition hover:border-violet-200 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  aria-label="약속 날짜 선택"
                  aria-expanded={calendarOpen}
                >
                  <CalendarDays className="h-4 w-4 shrink-0 text-[#5A45E8]" strokeWidth={2.2} aria-hidden="true" />
                  <span className={`min-w-0 flex-1 truncate text-[11px] font-black sm:text-xs ${parsedMeetingDate ? 'text-slate-800' : 'text-slate-400'}`}>
                    {parsedMeetingDate ? (
                      <>
                        <span className="sm:hidden">{Number(dateMonth)}월 {Number(dateDay)}일</span>
                        <span className="hidden sm:inline">{formatMeetingDateConfirmation(parsedMeetingDate)}</span>
                      </>
                    ) : '날짜 선택'}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${calendarOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {calendarOpen ? (
                  <MeetingCalendar
                    selectedMonth={dateMonth}
                    selectedDay={dateDay}
                    viewMonth={calendarViewMonth}
                    onChangeViewMonth={setCalendarViewMonth}
                    onSelect={selectCalendarDate}
                    onClose={() => setCalendarOpen(false)}
                  />
                ) : null}
              </div>

              <div ref={timePickerRootRef} className="relative min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setCalendarOpen(false)
                    setTimePickerOpen((open) => !open)
                  }}
                  className="flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left transition hover:border-violet-200 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  aria-label="약속 시간 선택"
                  aria-expanded={timePickerOpen}
                >
                  <Clock3 className="h-4 w-4 shrink-0 text-[#5A45E8]" strokeWidth={2.2} aria-hidden="true" />
                  <span className={`min-w-0 flex-1 truncate text-[11px] font-black sm:text-xs ${parsedMeetingTime ? 'text-slate-800' : 'text-slate-400'}`}>
                    {parsedMeetingTime ? formatMeetingTimeConfirmation(parsedMeetingTime) : '시간 선택'}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${timePickerOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {timePickerOpen ? (
                  <div className="absolute bottom-[calc(100%+8px)] right-0 z-40 w-[min(286px,calc(100vw-3rem))] rounded-2xl border border-violet-100 bg-white p-3 shadow-[0_18px_45px_rgba(45,35,100,0.18)]">
                    <TimeWheelPicker
                      period={timePeriod}
                      hour={timeHour}
                      minute={timeMinute}
                      onChangePeriod={(value) => { setTimePeriod(value); setScheduleUndecided(false); setScheduleValidationAttempted(false) }}
                      onChangeHour={(value) => { setTimeHour(value); if (!timeMinute) setTimeMinute('00'); setScheduleUndecided(false); setScheduleValidationAttempted(false) }}
                      onChangeMinute={(value) => { setTimeMinute(value); setScheduleUndecided(false); setScheduleValidationAttempted(false) }}
                      onComplete={completeTimeSelection}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-[10px] font-bold text-slate-500 sm:text-[11px]">
              <input
                type="checkbox"
                checked={scheduleUndecided}
                onChange={(event) => event.target.checked ? clearSchedule() : setScheduleUndecided(false)}
                className="h-3.5 w-3.5 rounded border-slate-300 accent-[#5A45E8]"
              />
              아직 일정을 정하지 않았어요.
            </label>
            {(scheduleValidationAttempted && (dateInvalid || timeInvalid)) || saveError ? (
              <p className="mt-1 text-[10px] font-bold leading-4 text-red-600" role="alert">
                {scheduleValidationAttempted && dateInvalid
                  ? '날짜를 다시 선택해 주세요.'
                  : scheduleValidationAttempted && timeInvalid
                    ? '시간을 다시 선택해 주세요.'
                    : saveError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={`grid grid-cols-2 gap-2.5 px-4 pb-4 pt-2.5 sm:gap-3 sm:px-5 sm:pb-5 sm:pt-3.5 ${loggedIn ? 'sm:px-7 sm:pb-6' : 'sm:px-6 sm:pb-6 sm:pt-5'}`}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-10 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-600 transition hover:bg-slate-50 sm:h-11"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => (loggedIn ? submit() : onLogin())}
            disabled={isSaving}
            className="h-10 rounded-xl bg-[#5A45E8] text-xs font-black text-white shadow-[0_8px_18px_rgba(90,69,232,0.18)] transition hover:bg-[#4D39D4] disabled:cursor-default disabled:bg-violet-200 sm:h-11"
          >
            {loggedIn
              ? isSaving ? <>저장 중<AnimatedLoadingDots /></> : '저장하기'
              : '로그인하고 저장'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default SaveMeetingDialog
