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
  icon: Icon,
  trailing,
  ...inputProps
}) {
  const feedback = error || message
  const feedbackTone = error ? 'error' : messageTone

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-extrabold text-slate-700">{label}</span>
      <span className="relative block">
        {Icon && (
          <Icon
            size={18}
            strokeWidth={2}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        )}
        <input
          {...inputProps}
          className={`h-12 w-full rounded-xl border bg-white text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-[#DCD5FF] ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${trailing ? 'pr-11' : 'pr-3.5'} ${
            feedbackTone === 'error' && feedback
              ? 'border-red-400'
              : 'border-slate-200 focus:border-[#8A76EF]'
          }`}
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
