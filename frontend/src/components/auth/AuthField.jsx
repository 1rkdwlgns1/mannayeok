function AuthField({ label, error, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-extrabold text-slate-700">{label}</span>
      <input
        {...inputProps}
        className={`h-11 w-full rounded-xl border bg-white px-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-[#DCD5FF] md:h-12 ${
          error ? 'border-red-400' : 'border-slate-200 focus:border-[#8A76EF]'
        }`}
        aria-invalid={Boolean(error)}
      />
      {error && <span className="mt-1.5 block text-xs font-bold text-red-500">{error}</span>}
    </label>
  )
}

export default AuthField
