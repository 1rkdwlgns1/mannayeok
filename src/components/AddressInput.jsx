import { useEffect, useState } from 'react'
import { searchAddressSuggestions } from '../services/kakaoApi'

function AddressInput({ origins, onChange, onSelect }) {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">출발지 입력</h2>
          <p className="mt-1 text-sm text-slate-500">두 출발지를 검색 결과에서 선택해주세요.</p>
        </div>
        <span className="hidden rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#3182F6] sm:inline-flex">
          2명 기준
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-start">
        <AddressField origin={origins[0]} index={0} label="출발지 A" onChange={onChange} onSelect={onSelect} />

        <div className="hidden h-12 items-center justify-center md:flex">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-400">↔</div>
        </div>

        <AddressField origin={origins[1]} index={1} label="출발지 B" onChange={onChange} onSelect={onSelect} />
      </div>
    </div>
  )
}

function AddressField({ origin, index, label, onChange, onSelect }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const theme = getOriginTheme(index)

  useEffect(() => {
    const query = origin.query.trim()

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
  }, [origin.query, origin.selected])

  const handleSelect = (suggestion) => {
    onSelect(index, suggestion)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div>
      <label
        className={`block rounded-2xl border bg-slate-50 p-3 transition ${
          origin.selected ? `${theme.selectedBorder} ${theme.selectedBg} shadow-sm` : 'border-slate-100'
        }`}
      >
        <span className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-500">{label}</span>
          {origin.selected ? (
            <span className={`rounded-full bg-white px-2 py-0.5 text-xs font-bold ${theme.text}`}>선택됨</span>
          ) : null}
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
              if (suggestions.length) setOpen(true)
            }}
            placeholder={`${label} 검색`}
            className="min-w-0 flex-1 bg-transparent py-1 text-base font-black text-slate-950 outline-none placeholder:font-semibold placeholder:text-slate-400"
          />
        </div>
      </label>

      {origin.query && !origin.selected ? (
        <p className="mt-1 px-2 text-xs text-amber-600">검색 결과를 선택해야 정확하게 계산할 수 있어요.</p>
      ) : null}

      {open && (loading || suggestions.length > 0) ? (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">주소 검색 중...</div>
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

  return {
    selectedBg: 'bg-blue-50/70',
    selectedBorder: 'border-blue-200',
    solidBg: 'bg-[#3182F6]',
    text: 'text-[#3182F6]',
  }
}

export default AddressInput
