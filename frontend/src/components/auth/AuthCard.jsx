function AuthCard({
  eyebrow,
  title,
  description,
  children,
  wide = false,
  centered = false,
  titleClassName = '',
}) {
  return (
    <section className={`w-full rounded-[22px] border border-[#DDD6FF] bg-white/95 p-4 shadow-[0_18px_55px_rgba(75,55,160,0.11)] backdrop-blur sm:rounded-[26px] sm:p-5 ${wide ? 'max-w-[520px]' : 'max-w-[390px]'}`}>
      <div className={centered ? 'text-center' : ''}>
        {eyebrow && <p className="text-xs font-extrabold text-[#6548E8]">{eyebrow}</p>}
        <h1 className={`${eyebrow ? 'mt-1.5' : ''} text-[22px] font-black tracking-[-0.04em] sm:text-[24px] md:text-[28px] ${titleClassName}`}>{title}</h1>
        {description && (
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500 sm:text-sm">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

export default AuthCard
