import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, Eye, EyeOff, FilePenLine, Plus, Redo2, Trash2, Undo2 } from 'lucide-react'
import { clearAdminAccessToken, getAdminAccessToken } from '../../services/adminAuth'
import { getAccessToken, getStoredMember } from '../../services/authStorage'
import { createNotice, deleteNotice, getAdminNotices, restoreNotice, updateNotice } from '../../services/noticeApi'
import AnimatedLoadingDots from '../AnimatedLoadingDots'

const STATUS_OPTIONS = [
  { value: 'INFO', label: '안내' },
  { value: 'IN_PROGRESS', label: '조치 중' },
  { value: 'RESOLVED', label: '조치 완료' },
  { value: 'MAINTENANCE', label: '점검 예정' },
  { value: 'IMPORTANT', label: '중요' },
]

function getTodayValue() {
  const now = new Date()
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 10)
}

const EMPTY_FORM = {
  title: '',
  status: 'INFO',
  summary: '',
  details: '',
  note: '',
  published: false,
  publishedDate: getTodayValue(),
}

function sortNewestFirst(notices) {
  return [...notices].sort((left, right) => {
    const dateDifference = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    return dateDifference || Number(right.id) - Number(left.id)
  })
}

function toForm(notice) {
  return {
    title: notice.title,
    status: notice.status,
    summary: notice.summary,
    details: notice.details.join('\n'),
    note: notice.note || '',
    published: notice.published,
    publishedDate: notice.publishedAt?.slice(0, 10) || getTodayValue(),
  }
}

function AdminNoticePage() {
  const member = getStoredMember()
  const memberId = member?.id
  const memberRole = member?.role
  const accessToken = getAccessToken()
  const adminAccessToken = getAdminAccessToken()
  const isAdmin = memberRole === 'ADMIN'
  const [notices, setNotices] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [baselineForm, setBaselineForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [detailHistory, setDetailHistory] = useState({ undo: [], redo: [] })
  const [openTrashNoticeId, setOpenTrashNoticeId] = useState(null)
  const detailsInputRef = useRef(null)
  const isDirty = JSON.stringify(form) !== JSON.stringify(baselineForm)

  const selectedNotice = useMemo(
    () => notices.find((notice) => notice.id === selectedId) || null,
    [notices, selectedId],
  )
  const activeNotices = useMemo(
    () => notices.filter((notice) => !notice.deletedAt),
    [notices],
  )
  const deletedNotices = useMemo(
    () => notices.filter((notice) => notice.deletedAt),
    [notices],
  )

  useEffect(() => {
    if (!memberId || !accessToken) {
      window.location.replace('/login')
      return
    }
    if (!isAdmin) {
      window.location.replace('/')
      return
    }
    if (!adminAccessToken) {
      window.location.replace('/admin/verify?next=notices')
      return
    }

    getAdminNotices(adminAccessToken)
      .then((items) => setNotices(sortNewestFirst(items)))
      .catch((requestError) => {
        if (requestError.status === 401 || requestError.status === 403) {
          clearAdminAccessToken()
          window.location.replace('/admin/verify?next=notices')
          return
        }
        setError(requestError.message)
      })
      .finally(() => setLoading(false))
  }, [accessToken, adminAccessToken, isAdmin, memberId])

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const confirmDiscardChanges = () => (
    !isDirty || window.confirm('저장하지 않은 변경사항이 있어요. 변경사항을 버리고 이동할까요?')
  )

  const selectNotice = (notice) => {
    if (notice.id !== selectedId && !confirmDiscardChanges()) return
    const nextForm = toForm(notice)
    setSelectedId(notice.id)
    setForm(nextForm)
    setBaselineForm(nextForm)
    setError('')
    setSavedMessage('')
    setDetailHistory({ undo: [], redo: [] })
  }

  const startNewNotice = (skipConfirmation = false) => {
    if (!skipConfirmation && !confirmDiscardChanges()) return
    const nextForm = { ...EMPTY_FORM, publishedDate: getTodayValue() }
    setSelectedId(null)
    setForm(nextForm)
    setBaselineForm(nextForm)
    setError('')
    setSavedMessage('')
    setDetailHistory({ undo: [], redo: [] })
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
    setSavedMessage('')
  }

  const updateDetails = (value) => {
    if (value === form.details) return
    setDetailHistory((current) => ({
      undo: [...current.undo.slice(-99), form.details],
      redo: [],
    }))
    updateField('details', value)
  }

  const undoDetails = () => {
    setDetailHistory((current) => {
      if (current.undo.length === 0) return current
      const previousValue = current.undo[current.undo.length - 1]
      setForm((currentForm) => ({ ...currentForm, details: previousValue }))
      setError('')
      setSavedMessage('')
      return {
        undo: current.undo.slice(0, -1),
        redo: [form.details, ...current.redo].slice(0, 100),
      }
    })
    requestAnimationFrame(() => detailsInputRef.current?.focus())
  }

  const redoDetails = () => {
    setDetailHistory((current) => {
      if (current.redo.length === 0) return current
      const nextValue = current.redo[0]
      setForm((currentForm) => ({ ...currentForm, details: nextValue }))
      setError('')
      setSavedMessage('')
      return {
        undo: [...current.undo.slice(-99), form.details],
        redo: current.redo.slice(1),
      }
    })
    requestAnimationFrame(() => detailsInputRef.current?.focus())
  }

  const handleDetailsKeyDown = (event) => {
    if (!(event.ctrlKey || event.metaKey)) return
    if (event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) redoDetails()
      else undoDetails()
    } else if (event.key.toLowerCase() === 'y') {
      event.preventDefault()
      redoDetails()
    }
  }

  const insertDetailPrefix = (prefix) => {
    const textarea = detailsInputRef.current
    if (!textarea) return

    const value = form.details
    const selectionStart = textarea.selectionStart
    const selectionEnd = textarea.selectionEnd
    const firstLineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1
    const nextLineBreak = value.indexOf('\n', selectionEnd)
    const selectedBlockEnd = nextLineBreak === -1 ? value.length : nextLineBreak
    const selectedBlock = value.slice(firstLineStart, selectedBlockEnd)
    const prefixedBlock = selectedBlock
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n')
    const nextValue = `${value.slice(0, firstLineStart)}${prefixedBlock}${value.slice(selectedBlockEnd)}`

    updateDetails(nextValue)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(firstLineStart, firstLineStart + prefix.length)
    })
  }

  const applyDetailColor = (color) => {
    const textarea = detailsInputRef.current
    if (!textarea) return

    const value = form.details
    const selectionStart = textarea.selectionStart
    const selectionEnd = textarea.selectionEnd
    const hasSelection = selectionEnd > selectionStart
    const selectedText = hasSelection ? value.slice(selectionStart, selectionEnd) : '색상 텍스트'
    const formattedText = `[[${color}:${selectedText}]]`
    const nextValue = `${value.slice(0, selectionStart)}${formattedText}${value.slice(selectionEnd)}`
    const contentStart = selectionStart + color.length + 3

    updateDetails(nextValue)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(contentStart, contentStart + selectedText.length)
    })
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!form.title.trim() || !form.summary.trim() || !form.details.trim()) {
      setError('제목, 요약, 상세 내용을 모두 입력해 주세요.')
      return
    }

    setSaving(true)
    setError('')
    setSavedMessage('')
    try {
      const saved = selectedId
        ? await updateNotice(selectedId, form, adminAccessToken)
        : await createNotice(form, adminAccessToken)
      setNotices((current) => {
        const remaining = current.filter((notice) => notice.id !== saved.id)
        return sortNewestFirst([saved, ...remaining])
      })
      setSelectedId(saved.id)
      const savedForm = toForm(saved)
      setForm(savedForm)
      setBaselineForm(savedForm)
      setDetailHistory({ undo: [], redo: [] })
      setSavedMessage(saved.published ? '공지를 저장하고 공개했어요.' : '임시저장했어요.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedNotice || !window.confirm(`‘${selectedNotice.title}’ 공지를 삭제할까요?\n삭제 후 왼쪽 휴지통에서 복구할 수 있어요.`)) return
    setSaving(true)
    setError('')
    try {
      const deleted = await deleteNotice(selectedNotice.id, adminAccessToken)
      setNotices((current) => current.map((notice) => notice.id === deleted.id ? deleted : notice))
      startNewNotice(true)
      setSavedMessage('공지를 삭제했어요. 왼쪽 휴지통에서 복구할 수 있어요.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (notice) => {
    setSaving(true)
    setError('')
    setSavedMessage('')
    try {
      const restored = await restoreNotice(notice.id, adminAccessToken)
      setNotices((current) => sortNewestFirst(
        current.map((item) => item.id === restored.id ? restored : item),
      ))
      setOpenTrashNoticeId(null)
      setSavedMessage(`‘${restored.title}’ 공지를 복구했어요.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  if (!member || !accessToken || !adminAccessToken || !isAdmin) return null

  const handleGoHome = () => {
    if (!confirmDiscardChanges()) return
    window.location.assign('/')
  }

  return (
    <main className="min-h-dvh bg-white text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <button type="button" onClick={handleGoHome} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 transition hover:text-[#5A45E8]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> 홈으로
          </button>
          <p className="text-sm font-black text-[#5A45E8]">만나역 관리자</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#5A45E8]">NOTICE</p>
              <h1 className="mt-1 text-xl font-black tracking-tight">공지 관리</h1>
            </div>
            <button type="button" onClick={() => startNewNotice()} className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#5A45E8] px-3 text-xs font-black text-white transition hover:bg-[#4D39D4]">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 새 공지
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {loading ? (
              <p className="py-5 text-sm text-slate-400">
                공지를 불러오는 중<AnimatedLoadingDots />
              </p>
            ) : null}
            {!loading && activeNotices.length === 0 ? <p className="py-5 text-sm text-slate-400">등록된 공지가 없습니다.</p> : null}
            {activeNotices.map((notice) => (
              <button
                key={notice.id}
                type="button"
                onClick={() => selectNotice(notice)}
                className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${selectedId === notice.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-200'}`}
              >
                <span className="block truncate text-sm font-extrabold text-slate-800">{notice.title}</span>
                <span className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  {notice.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {notice.published ? '공개' : '임시저장'} · {STATUS_OPTIONS.find((option) => option.value === notice.status)?.label}
                </span>
              </button>
            ))}

            {deletedNotices.length > 0 ? (
              <div className="pt-5">
                <div className="mb-2 flex items-center gap-2 border-t border-slate-200 pt-4">
                  <Trash2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <p className="text-xs font-black text-slate-500">휴지통 {deletedNotices.length}</p>
                </div>
                <div className="space-y-2">
                  {deletedNotices.map((notice) => (
                    <div key={notice.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setOpenTrashNoticeId((current) => current === notice.id ? null : notice.id)}
                        className="flex w-full items-center gap-2 px-3.5 py-3 text-left transition hover:bg-slate-100"
                        aria-expanded={openTrashNoticeId === notice.id}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-500">{notice.title}</span>
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition ${openTrashNoticeId === notice.id ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>
                      {openTrashNoticeId === notice.id ? (
                        <div className="border-t border-slate-200 bg-white px-3.5 py-3">
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400">
                            <span>{STATUS_OPTIONS.find((option) => option.value === notice.status)?.label}</span>
                            <span aria-hidden="true">·</span>
                            <span>{notice.publishedAt?.slice(0, 10) || '미공개'}</span>
                          </div>
                          <p className="mt-2 text-xs font-bold leading-5 text-slate-700">{notice.summary}</p>
                          <div className="mt-2 space-y-1.5">
                            {notice.details.map((detail, index) => (
                              <p key={`${notice.id}-trash-${index}`} className="break-words text-[11px] font-medium leading-5 text-slate-500">
                                {detail.replace(/\[\[(?:violet|red|gray|black):([^\]]*?)\]\]/g, '$1')}
                              </p>
                            ))}
                          </div>
                          {notice.note ? <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-400">참고: {notice.note}</p> : null}
                          <button type="button" onClick={() => handleRestore(notice)} disabled={saving} className="mt-3 h-8 rounded-lg border border-violet-200 bg-white px-3 text-xs font-black text-[#5A45E8] transition hover:bg-violet-50 disabled:opacity-50">
                            공지 복구
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="flex items-center gap-2">
            <FilePenLine className="h-5 w-5 text-[#5A45E8]" aria-hidden="true" />
            <h2 className="text-lg font-black">{selectedNotice ? '공지 수정' : '새 공지 작성'}</h2>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">블로그 글을 쓰듯 내용을 작성하고 공개 여부를 선택하세요.</p>

          <form onSubmit={handleSave} className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-extrabold text-slate-700">제목</span>
              <input value={form.title} onChange={(event) => updateField('title', event.target.value)} maxLength={120} placeholder="공지 제목을 입력해 주세요" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm font-extrabold text-slate-700">상태</span>
                <select value={form.status} onChange={(event) => updateField('status', event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
                  {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-extrabold text-slate-700">게시일</span>
                <input type="date" value={form.publishedDate} onChange={(event) => updateField('publishedDate', event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </label>
              <label className="block">
                <span className="text-sm font-extrabold text-slate-700">공개 설정</span>
                <button type="button" onClick={() => updateField('published', !form.published)} className={`mt-2 flex h-11 w-full items-center justify-between rounded-xl border px-3.5 text-sm font-bold transition ${form.published ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                  {form.published ? '바로 공개' : '임시저장'}
                  {form.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-extrabold text-slate-700">한 줄 요약</span>
              <textarea value={form.summary} onChange={(event) => updateField('summary', event.target.value)} maxLength={500} rows={3} placeholder="목록을 펼쳤을 때 먼저 보일 요약을 작성해 주세요" className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium leading-6 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </label>

            <label className="block">
              <span className="text-sm font-extrabold text-slate-700">상세 내용</span>
              <span className="ml-2 text-[11px] font-medium text-slate-400">입력한 줄바꿈과 기호가 그대로 표시됩니다</span>
              <div className="mt-2 flex items-center gap-1.5 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 px-2 py-1.5">
                <button type="button" onClick={undoDetails} disabled={detailHistory.undo.length === 0} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-[#5A45E8] disabled:cursor-default disabled:opacity-30" title="실행 취소 (Ctrl+Z)" aria-label="실행 취소"><Undo2 className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={redoDetails} disabled={detailHistory.redo.length === 0} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-[#5A45E8] disabled:cursor-default disabled:opacity-30" title="다시 실행 (Ctrl+Y)" aria-label="다시 실행"><Redo2 className="h-3.5 w-3.5" /></button>
                <span className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden="true" />
                <button type="button" onClick={() => insertDetailPrefix('• ')} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-white hover:text-[#5A45E8]" title="선택한 줄에 글머리표 추가">• 글머리표</button>
                <button type="button" onClick={() => insertDetailPrefix('- ')} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-white hover:text-[#5A45E8]" title="선택한 줄에 목록 기호 추가">- 목록</button>
                <span className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden="true" />
                <button type="button" onClick={() => applyDetailColor('violet')} className="h-7 w-7 rounded-lg transition hover:bg-white" title="브랜드 보라색 적용" aria-label="브랜드 보라색 적용"><span className="mx-auto block h-3.5 w-3.5 rounded-full bg-[#5A45E8]" /></button>
                <button type="button" onClick={() => applyDetailColor('red')} className="h-7 w-7 rounded-lg transition hover:bg-white" title="빨간색 적용" aria-label="빨간색 적용"><span className="mx-auto block h-3.5 w-3.5 rounded-full bg-red-600" /></button>
                <button type="button" onClick={() => applyDetailColor('gray')} className="h-7 w-7 rounded-lg transition hover:bg-white" title="회색 적용" aria-label="회색 적용"><span className="mx-auto block h-3.5 w-3.5 rounded-full bg-slate-500" /></button>
                <button type="button" onClick={() => applyDetailColor('black')} className="h-7 w-7 rounded-lg transition hover:bg-white" title="검은색 적용" aria-label="검은색 적용"><span className="mx-auto block h-3.5 w-3.5 rounded-full bg-slate-950" /></button>
              </div>
              <textarea ref={detailsInputRef} value={form.details} onChange={(event) => updateDetails(event.target.value)} onKeyDown={handleDetailsKeyDown} rows={8} placeholder={'글머리표 버튼을 누르거나 내용을 직접 입력해 주세요'} className="w-full resize-y rounded-b-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium leading-6 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </label>

            <label className="block">
              <span className="text-sm font-extrabold text-slate-700">참고 문구</span>
              <span className="ml-2 text-[11px] font-medium text-slate-400">선택</span>
              <input value={form.note} onChange={(event) => updateField('note', event.target.value)} maxLength={500} placeholder="추가로 강조할 내용을 입력해 주세요" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </label>

            {error ? <p className="text-xs font-bold text-red-600">{error}</p> : null}
            {savedMessage ? <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"><Check className="h-3.5 w-3.5" />{savedMessage}</p> : null}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              {selectedNotice ? (
                <button type="button" onClick={handleDelete} disabled={saving} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50">
                  <Trash2 className="h-4 w-4" /> 삭제
                </button>
              ) : <span />}
              <div className="flex gap-2">
                <button type="button" onClick={() => startNewNotice()} disabled={saving} className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:flex-none">초기화</button>
                <button type="submit" disabled={saving} className="h-10 flex-1 rounded-xl bg-[#5A45E8] px-6 text-sm font-black text-white transition hover:bg-[#4D39D4] disabled:cursor-default disabled:opacity-50 sm:flex-none">
                  {saving ? (
                    <>저장 중<AnimatedLoadingDots /></>
                  ) : form.published ? '저장하고 공개' : '임시저장'}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

export default AdminNoticePage
