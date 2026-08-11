import { useState } from 'react'

const MESSAGE_TONES = {
  neutral: 'text-slate-500',
  success: 'text-emerald-600',
  error: 'text-red-500',
}

function AuthField({
  label,
  error,
  message,
  messageTone = 'neutral',
  dense = false,
  icon: Icon,
  trailing,
  placeholder,
  onFocus,
  onBlur,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false)
  const feedback = error || message
  const feedbackTone = error ? 'error' : messageTone

  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-extrabold text-slate-700 sm:text-sm">{label}</span>
      <span className="relative block">
        {Icon && (
          <Icon
            size={18}
            strokeWidth={2}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300"
            aria-hidden="true"
          />
        )}
        <input
          {...inputProps}
          placeholder={focused ? '' : placeholder}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          className={`${dense ? 'text-base sm:text-sm' : 'text-[13px]'} h-10 w-full rounded-xl border bg-white font-medium text-slate-900 outline-none transition placeholder:text-xs placeholder:text-slate-300 focus:placeholder:text-transparent focus:ring-2 focus:ring-[#E8E3FF] sm:h-11 sm:text-sm ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${trailing ? 'pr-11' : 'pr-3.5'} ${
            feedbackTone === 'error' && feedback
              ? 'border-red-400'
              : 'border-slate-200 focus:border-[#8A76EF]'
          }`}
          style={{ WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset', WebkitTextFillColor: '#0F172A' }}
          aria-invalid={feedbackTone === 'error' && Boolean(feedback)}
        />
        {trailing && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</span>
        )}
      </span>
      {feedback && (
        <span className={`mt-1.5 block text-xs font-bold ${MESSAGE_TONES[feedbackTone]}`}>
          {feedback}
        </span>
      )}
    </label>
  )
}

export default AuthField
