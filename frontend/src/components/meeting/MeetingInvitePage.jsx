import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  MapPin,
  Pencil,
  RefreshCw,
  Search,
  Share2,
  UserRound,
  UsersRound,
} from 'lucide-react'
import AuthLayout from '../auth/AuthLayout.jsx'
import AnimatedLoadingDots from '../AnimatedLoadingDots.jsx'
import { searchAddressSuggestions } from '../../services/kakaoApi.js'
import {
  getCollaborativeMeeting,
  joinCollaborativeMeeting,
  updateMeetingParticipant,
} from '../../services/meetingApi.js'
import { getLineChipStyle } from '../../utils/subwayLineTheme.js'

const PARTICIPANT_STORAGE_PREFIX = 'mannayeok.meetingParticipant.'

function getInviteCode() {
  return decodeURIComponent(window.location.pathname.match(/^\/meet\/([^/]+)$/)?.[1] || '')
}

function getStoredParticipation(inviteCode) {
  try {
    return JSON.parse(window.localStorage.getItem(`${PARTICIPANT_STORAGE_PREFIX}${inviteCode}`) || 'null')
  } catch {
    return null
  }
}

function formatSchedule(meeting) {
  if (!meeting?.meetingDate) return '일정 미정'
  const date = new Date(`${meeting.meetingDate}T00:00:00`)
  const dateText = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(date)
  if (!meeting.meetingTime) return dateText
  const [hourText, minute = '00'] = meeting.meetingTime.split(':')
  const hour = Number(hourText)
  return `${dateText} · ${hour < 12 ? '오전' : '오후'} ${hour % 12 || 12}:${minute}`
}

function MeetingInvitePage() {
  const inviteCode = getInviteCode()
  const [meeting, setMeeting] = useState(null)
  const [loadStatus, setLoadStatus] = useState('loading')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [participation, setParticipation] = useState(() => getStoredParticipation(inviteCode))
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [originQuery, setOriginQuery] = useState('')
  const [selectedOrigin, setSelectedOrigin] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const searchRootRef = useRef(null)

  const refreshMeeting = async () => {
    const nextMeeting = await getCollaborativeMeeting(inviteCode)
    setMeeting(nextMeeting)
    return nextMeeting
  }

  useEffect(() => {
    let active = true
    getCollaborativeMeeting(inviteCode)
      .then((nextMeeting) => {
        if (!active) return
        setMeeting(nextMeeting)
        setLoadStatus('ready')
      })
      .catch((loadError) => {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : '모임을 불러오지 못했어요.')
        setLoadStatus('error')
      })
    return () => { active = false }
  }, [inviteCode])

  useEffect(() => {
    if (originQuery.trim().length < 2 || selectedOrigin?.routeName === originQuery) return undefined
    const timer = window.setTimeout(() => {
      setSearching(true)
      searchAddressSuggestions(originQuery)
        .then(setSuggestions)
        .catch((searchError) => {
          setSuggestions([])
          setError(searchError instanceof Error ? searchError.message : '출발지를 검색하지 못했어요.')
        })
        .finally(() => setSearching(false))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [originQuery, selectedOrigin])

  useEffect(() => {
    const closeSuggestions = (event) => {
      if (!searchRootRef.current?.contains(event.target)) setSuggestions([])
    }
    window.addEventListener('pointerdown', closeSuggestions)
    return () => window.removeEventListener('pointerdown', closeSuggestions)
  }, [])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const ownParticipant = participation
    ? meeting?.participants.find((participant) => participant.id === participation.participantId)
    : null

  const beginEdit = () => {
    if (!ownParticipant) return
    setNickname(ownParticipant.nickname)
    setOriginQuery(ownParticipant.originName)
    setSelectedOrigin(participation?.origin || null)
    setEditing(true)
    setError('')
  }

  const selectOrigin = (origin) => {
    setSelectedOrigin(origin)
    setOriginQuery(origin.routeName || origin.roadAddress || origin.address)
    setSuggestions([])
    setError('')
  }

  const submit = async () => {
    if (!nickname.trim() || !selectedOrigin || submitting) return
    setSubmitting(true)
    setError('')
    const body = {
      nickname: nickname.trim(),
      originName: selectedOrigin.routeName || selectedOrigin.roadAddress || selectedOrigin.address,
      originAddress: selectedOrigin.address,
      originLat: selectedOrigin.lat,
      originLng: selectedOrigin.lng,
    }
    try {
      if (editing && participation) {
        await updateMeetingParticipant(inviteCode, participation.participantId, participation.participantToken, body)
        const stored = { ...participation, origin: selectedOrigin }
        window.localStorage.setItem(`${PARTICIPANT_STORAGE_PREFIX}${inviteCode}`, JSON.stringify(stored))
        setParticipation(stored)
        setEditing(false)
        setNotice('내 참여 정보를 수정했어요.')
      } else {
        const joined = await joinCollaborativeMeeting(inviteCode, body)
        const stored = { participantId: joined.participant.id, participantToken: joined.participantToken, origin: selectedOrigin }
        window.localStorage.setItem(`${PARTICIPANT_STORAGE_PREFIX}${inviteCode}`, JSON.stringify(stored))
        setParticipation(stored)
        setNotice('모임에 참여했어요.')
      }
      setNickname('')
      setOriginQuery('')
      setSelectedOrigin(null)
      await refreshMeeting()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '모임에 참여하지 못했어요.')
    } finally {
      setSubmitting(false)
    }
  }

  const shareInvite = async () => {
    const data = { title: meeting.name, text: `${meeting.name} 출발지를 함께 입력해요.`, url: window.location.href }
    try {
      if (navigator.share) await navigator.share(data)
      else {
        await navigator.clipboard.writeText(window.location.href)
        setNotice('초대 링크를 복사했어요.')
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') setError('초대 링크를 공유하지 못했어요.')
    }
  }

  if (loadStatus === 'loading') {
    return <AuthLayout backTo="/" backLabel="만나역으로 돌아가기" compactFooter><div className="rounded-2xl bg-white px-8 py-16 text-sm font-bold text-slate-500 shadow-sm">모임을 불러오는 중<AnimatedLoadingDots /></div></AuthLayout>
  }

  if (!meeting) {
    return <AuthLayout backTo="/" backLabel="만나역으로 돌아가기" compactFooter><div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-black text-slate-950">모임을 찾을 수 없어요</h1><p className="mt-2 text-sm text-slate-500">{error || '초대 링크를 다시 확인해 주세요.'}</p></div></AuthLayout>
  }

  const showForm = !ownParticipant || editing

  return (
    <AuthLayout backTo="/" backLabel="만나역으로 돌아가기" dashboard compactFooter>
      <main className="w-full max-w-[760px] overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-[0_22px_70px_rgba(66,50,145,0.12)] sm:rounded-[28px]">
        <header className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-[#5A45E8] ring-1 ring-inset ring-violet-100">
                <UsersRound className="h-3.5 w-3.5" aria-hidden="true" /> 함께하는 모임
              </span>
              <h1 className="mt-3 truncate text-[25px] font-black tracking-[-0.04em] text-slate-950 sm:text-[30px]">{meeting.name}</h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{formatSchedule(meeting)}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />현재 추천역 {meeting.stationName}</span>
              </p>
            </div>
            <button type="button" onClick={shareInvite} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-100 text-[#5A45E8] transition hover:bg-violet-50" aria-label="초대 링크 공유">
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {meeting.stationLines.map((line) => <span key={line} style={getLineChipStyle(line)} className="rounded-full border px-2.5 py-1 text-[10px] font-black">{line}</span>)}
          </div>
        </header>

        <div className="grid gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-black text-slate-950">참여자</h2>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">각자 입력한 출발지로 방장이 다시 추천해요.</p>
              </div>
              <span className="flex items-center gap-1.5"><button type="button" onClick={() => refreshMeeting().catch(() => setError('모임 정보를 새로 불러오지 못했어요.'))} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-[#5A45E8]" aria-label="모임 정보 새로고침"><RefreshCw className="h-3.5 w-3.5" /></button><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{meeting.participants.length}/4명</span></span>
            </div>
            <div className="mt-3 space-y-2">
              {meeting.participants.length ? meeting.participants.map((participant) => (
                <div key={participant.id} className={`flex items-center gap-3 rounded-xl border p-3 ${participant.id === ownParticipant?.id ? 'border-violet-200 bg-violet-50/50' : 'border-slate-100 bg-slate-50/60'}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#5A45E8] shadow-sm"><UserRound className="h-4 w-4" aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1"><strong className="block truncate text-xs font-black text-slate-900">{participant.nickname}{participant.id === ownParticipant?.id ? ' · 나' : ''}</strong><span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">{participant.originName}</span></div>
                  {participant.id === ownParticipant?.id && !editing ? <button type="button" onClick={beginEdit} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-[#5A45E8]" aria-label="내 참여 정보 수정"><Pencil className="h-3.5 w-3.5" /></button> : null}
                </div>
              )) : <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/30 px-4 py-8 text-center text-xs font-bold text-slate-500">아직 참여자가 없어요. 첫 번째로 출발지를 알려주세요.</div>}
            </div>
          </section>

          <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-[0_8px_24px_rgba(70,52,150,0.07)]">
            {showForm ? (
              <>
                <h2 className="text-[15px] font-black text-slate-950">{editing ? '내 정보 수정' : '모임에 참여하기'}</h2>
                <p className="mt-1 text-[10px] font-medium leading-4 text-slate-500">로그인 없이 닉네임과 출발지만 입력하면 돼요.</p>
                <label className="mt-4 block text-[11px] font-black text-slate-700" htmlFor="meeting-nickname">닉네임</label>
                <input id="meeting-nickname" value={nickname} onChange={(event) => setNickname(event.target.value.slice(0, 20))} placeholder="예: 지훈" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-bold outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
                <div ref={searchRootRef} className="relative mt-3">
                  <label className="block text-[11px] font-black text-slate-700" htmlFor="meeting-origin">내 출발지</label>
                  <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3.5 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <input id="meeting-origin" value={originQuery} onChange={(event) => { setOriginQuery(event.target.value); setSelectedOrigin(null) }} placeholder="역 또는 장소 검색" className="min-w-0 flex-1 bg-transparent text-xs font-bold outline-none" />
                  </div>
                  {(searching || suggestions.length) ? <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">{searching ? <p className="px-3 py-2 text-xs text-slate-500">검색 중<AnimatedLoadingDots /></p> : suggestions.map((origin) => <button key={origin.id} type="button" onClick={() => selectOrigin(origin)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-violet-50"><strong className="block truncate text-[11px] font-bold text-slate-900">{origin.routeName || origin.roadAddress || origin.address}</strong><span className="mt-0.5 block truncate text-[10px] text-slate-400">{origin.address}</span></button>)}</div> : null}
                </div>
                {error ? <p className="mt-3 text-[10px] font-bold leading-4 text-red-600" role="alert">{error}</p> : null}
                <button type="button" onClick={submit} disabled={!nickname.trim() || !selectedOrigin || submitting} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[#5A45E8] text-xs font-black text-white transition hover:bg-[#4D39D4] disabled:cursor-default disabled:bg-violet-200">
                  {submitting ? <>저장 중<AnimatedLoadingDots /></> : <>{editing ? '수정하기' : '모임 참여하기'}<ArrowRight className="h-3.5 w-3.5" /></>}
                </button>
                {editing ? <button type="button" onClick={() => { setEditing(false); setError('') }} className="mt-2 h-9 w-full text-[11px] font-black text-slate-500">취소</button> : null}
              </>
            ) : (
              <div className="py-3 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-5 w-5" aria-hidden="true" /></span>
                <h2 className="mt-3 text-[15px] font-black text-slate-950">참여 완료</h2>
                <p className="mt-1 text-[11px] font-medium leading-5 text-slate-500">방장이 참여자 출발지로 다시 추천하면 이 화면에서 새 약속역을 확인할 수 있어요.</p>
                <button type="button" onClick={shareInvite} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-violet-200 text-xs font-black text-[#5A45E8] hover:bg-violet-50"><Copy className="h-3.5 w-3.5" />친구에게 링크 보내기</button>
              </div>
            )}
          </section>
        </div>
        {meeting.needsRecommendation && meeting.participants.length >= 2 ? <p className="border-t border-violet-100 bg-violet-50/60 px-5 py-3 text-center text-[11px] font-bold text-[#6B56D9]">참여자 정보가 바뀌었어요. 방장이 다시 추천하면 새 약속역이 표시돼요.</p> : null}
      </main>
      {notice ? <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl" role="status">{notice}</div> : null}
    </AuthLayout>
  )
}

export default MeetingInvitePage
