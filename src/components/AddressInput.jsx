import { useEffect, useRef, useState } from 'react'
import { searchAddressSuggestions } from '../services/kakaoApi'

const RECENT_ORIGINS_KEY = 'meetmiddle:recent-origins'
const RECENT_ORIGIN_LIMIT = 6

const ORIGIN_LABELS = ['출발지 A', '출발지 B', '출발지 C', '출발지 D']

function AddressInput({ origins, maxOrigins, minOrigins, onAddOrigin, onChange, onRemoveOrigin, onReset, onSelect }) {
  const canAddOrigin = origins.length < maxOrigins
  const canRemoveOrigin = origins.length > minOrigins

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">출발지 입력</h2>
          <p className="mt-1 text-sm text-slate-500">각자의 출발지를 검색해서 선택해주세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-500 ring-1 ring-rose-100 transition hover:bg-rose-100 active:scale-[0.98]"
          >
            <span aria-hidden="true">↻</span>
            초기화
          </button>
          <span className="hidden rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#3182F6] sm:inline-flex">
            {origins.length}명 기준
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {origins.map((origin, index) => (
          <AddressField
            key={origin.id}
            canRemove={canRemoveOrigin}
            origin={origin}
            index={index}
            label={ORIGIN_LABELS[index] || `출발지 ${index + 1}`}
            onChange={onChange}
            onRemove={onRemoveOrigin}
            onSelect={onSelect}
          />
        ))}
      </div>

      {canAddOrigin ? (
        <button
          type="button"
          onClick={onAddOrigin}
          className="mt-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/70 px-4 py-2.5 text-sm font-bold text-[#3182F6] transition hover:bg-blue-100 active:scale-[0.98]"
        >
          + 인원 추가
        </button>
      ) : null}
    </div>
  )
}

function AddressField({ canRemove, origin, index, label, onChange, onRemove, onSelect }) {
  const [suggestions, setSuggestions] = useState([])
  const [recentOrigins, setRecentOrigins] = useState(() => getRecentOrigins())
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const fieldRef = useRef(null)
  const theme = getOriginTheme(index)
  const query = origin.query.trim()
  const showRecentOrigins = open && !query && recentOrigins.length > 0
  const showSuggestions = open && (loading || suggestions.length > 0)

  useEffect(() => {
    if (query.length < 2 || origin.selected?.address === query) {
      return undefined
    }

    const timerId = window.setTimeout(() => {
      setLoading(true)
      searchAddressSuggestions(query)
        .then((items) => {
          setSuggestions(items)
          setOpen(true)
        })
        .catch(() => {
          setSuggestions([])
          setOpen(false)
        })
        .finally(() => setLoading(false))
    }, 250)

    return () => window.clearTimeout(timerId)
  }, [query, origin.selected])

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!fieldRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleCloseDropdowns = () => {
      setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('meetmiddle:close-address-dropdowns', handleCloseDropdowns)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('meetmiddle:close-address-dropdowns', handleCloseDropdowns)
    }
  }, [open])

  const handleSelect = (suggestion) => {
    onSelect(index, suggestion)
    setRecentOrigins(saveRecentOrigin(suggestion))
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={fieldRef} className="relative">
      <div
        className={`block rounded-2xl border bg-slate-50 p-3 transition ${
          origin.selected ? `${theme.selectedBorder} ${theme.selectedBg} shadow-sm` : 'border-slate-100'
        }`}
      >
        <span className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-500">{label}</span>
          <span className="flex items-center gap-1.5">
            {origin.selected ? (
              <span className={`rounded-full bg-white px-2 py-0.5 text-xs font-bold ${theme.text}`}>선택됨</span>
            ) : null}
            {canRemove ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  onRemove(index)
                }}
                className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-400 transition hover:text-red-500"
              >
                삭제
              </button>
            ) : null}
          </span>
        </span>

        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${origin.selected ? theme.solidBg : 'bg-slate-300'}`}
          />
          <input
            type="text"
            value={origin.query}
            onChange={(event) => {
              onChange(index, event.target.value)
              setSuggestions([])
              setOpen(true)
            }}
            onFocus={() => {
              setRecentOrigins(getRecentOrigins())
              if (!origin.selected) setOpen(true)
            }}
            placeholder={`${label} 검색`}
            className="min-w-0 flex-1 bg-transparent py-1 text-base font-black text-slate-950 outline-none placeholder:font-semibold placeholder:text-slate-400"
          />
        </div>
      </div>

      {origin.query && !origin.selected ? (
        <p className="mt-1 px-2 text-xs text-amber-600">검색 결과를 선택해야 정확하게 계산할 수 있어요.</p>
      ) : null}

      {showRecentOrigins || showSuggestions ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">주소 검색 중...</div>
          ) : showRecentOrigins ? (
            <>
              <div className="border-b border-slate-100 px-4 py-2 text-xs font-bold text-slate-500">최근 선택한 출발지</div>
              {recentOrigins.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-blue-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(suggestion)}
                >
                  <span className="block text-sm font-bold text-slate-950">
                    {suggestion.roadAddress || suggestion.address}
                  </span>
                  {suggestion.roadAddress ? (
                    <span className="mt-1 block text-xs text-slate-500">{suggestion.address}</span>
                  ) : null}
                </button>
              ))}
            </>
          ) : (
            <>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-blue-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(suggestion)}
                >
                  <span className="block text-sm font-bold text-slate-950">
                    {suggestion.roadAddress || suggestion.address}
                  </span>
                  {suggestion.roadAddress ? (
                    <span className="mt-1 block text-xs text-slate-500">{suggestion.address}</span>
                  ) : null}
                </button>
              ))}

              {shouldShowBroadKeywordHint(origin.query, suggestions) ? (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                  <p className="font-semibold text-slate-700">지역명만 입력하면 후보가 적을 수 있어요.</p>
                  <p>예: 서울역, 시청역, 강남역처럼 역 이름이나 구체적인 장소명을 입력해보세요.</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

function getRecentOrigins() {
  if (typeof window === 'undefined') return []

  try {
    const items = JSON.parse(window.localStorage.getItem(RECENT_ORIGINS_KEY) || '[]')

    return Array.isArray(items) ? items.slice(0, RECENT_ORIGIN_LIMIT) : []
  } catch {
    return []
  }
}

function saveRecentOrigin(origin) {
  if (typeof window === 'undefined') return []

  const nextOrigins = [
    origin,
    ...getRecentOrigins().filter((item) => item.id !== origin.id),
  ].slice(0, RECENT_ORIGIN_LIMIT)

  window.localStorage.setItem(RECENT_ORIGINS_KEY, JSON.stringify(nextOrigins))

  return nextOrigins
}

function shouldShowBroadKeywordHint(query, suggestions) {
  const trimmedQuery = query.trim()
  const broadKeywords = ['서울', '경기', '인천', '부산', '대구', '대전', '광주']

  return suggestions.length <= 1 && broadKeywords.includes(trimmedQuery)
}

function getOriginTheme(index) {
  if (index === 1) {
    return {
      selectedBg: 'bg-green-50/80',
      selectedBorder: 'border-green-200',
      solidBg: 'bg-[#00A84D]',
      text: 'text-[#00A84D]',
    }
  }

  if (index === 2) {
    return {
      selectedBg: 'bg-yellow-50/80',
      selectedBorder: 'border-yellow-200',
      solidBg: 'bg-yellow-400',
      text: 'text-yellow-600',
    }
  }

  if (index === 3) {
    return {
      selectedBg: 'bg-purple-50/80',
      selectedBorder: 'border-purple-200',
      solidBg: 'bg-purple-500',
      text: 'text-purple-600',
    }
  }

  return {
    selectedBg: 'bg-blue-50/70',
    selectedBorder: 'border-blue-200',
    solidBg: 'bg-[#3182F6]',
    text: 'text-[#3182F6]',
  }
}

export default AddressInput
