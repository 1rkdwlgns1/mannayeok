import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'

const PERIOD_OPTIONS = ['오전', '오후']
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1))
const BASE_MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))

function getMinuteOptions(currentMinute) {
  if (!/^\d{2}$/.test(currentMinute) || BASE_MINUTE_OPTIONS.includes(currentMinute)) return BASE_MINUTE_OPTIONS
  return [...BASE_MINUTE_OPTIONS, currentMinute].sort((left, right) => Number(left) - Number(right))
}

function TimeWheelColumn({ label, value, options, onChange, formatOption = (option) => option }) {
  const selectedOptionRef = useRef(null)

  useEffect(() => {
    selectedOptionRef.current?.scrollIntoView({ block: 'center' })
  }, [value])

  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-center text-[9px] font-black tracking-[0.08em] text-slate-400">{label}</p>
      <div className="h-[116px] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-xl border border-slate-100 bg-slate-50/80 p-1.5 [scrollbar-width:thin]">
        {options.map((option) => {
          const selected = option === value
          return (
            <button
              key={option}
              ref={selected ? selectedOptionRef : null}
              type="button"
              onClick={() => onChange(option)}
              className={`mb-1 flex h-8 w-full snap-center items-center justify-center rounded-lg text-xs font-black transition last:mb-0 ${selected ? 'bg-[#EEE9FF] text-[#5A45E8] shadow-sm ring-1 ring-violet-200' : 'text-slate-500 hover:bg-white hover:text-slate-800'}`}
              aria-pressed={selected}
            >
              {formatOption(option)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TimeWheelPicker({ period, hour, minute, onChangePeriod, onChangeHour, onChangeMinute, onComplete }) {
  const minuteOptions = getMinuteOptions(minute)
  const preview = hour ? `${period} ${hour}:${minute || '00'}` : '시간을 선택해 주세요'

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black text-slate-800">시간 선택</p>
          <p className={`mt-0.5 text-[10px] font-bold ${hour ? 'text-[#6548E8]' : 'text-slate-400'}`}>{preview}</p>
        </div>
        <span className="rounded-lg bg-violet-50 px-2 py-1 text-[9px] font-black text-[#7562DB]">5분 단위</span>
      </div>

      <div className="mt-2.5 grid grid-cols-[0.9fr_1fr_1fr] gap-1.5">
        <TimeWheelColumn label="구분" value={period} options={PERIOD_OPTIONS} onChange={onChangePeriod} />
        <TimeWheelColumn label="시" value={hour} options={HOUR_OPTIONS} onChange={onChangeHour} formatOption={(option) => `${option}시`} />
        <TimeWheelColumn label="분" value={minute} options={minuteOptions} onChange={onChangeMinute} formatOption={(option) => `${option}분`} />
      </div>

      <button
        type="button"
        onClick={onComplete}
        disabled={!hour}
        className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#5A45E8] text-xs font-black text-white transition hover:bg-[#4D39D4] disabled:bg-violet-200"
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        선택 완료
      </button>
    </div>
  )
}

export default TimeWheelPicker
