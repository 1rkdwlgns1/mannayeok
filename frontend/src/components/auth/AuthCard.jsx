function AuthCard({
  eyebrow,
  title,
  description,
  children,
  wide = false,
  centered = false,
}) {
  return (
    <section className={`w-full rounded-[26px] border border-[#DDD6FF] bg-white/95 p-5 shadow-[0_18px_55px_rgba(75,55,160,0.11)] backdrop-blur ${wide ? 'max-w-[520px]' : 'max-w-[390px]'}`}>
      <div className={centered ? 'text-center' : ''}>
        {eyebrow && <p className="text-xs font-extrabold text-[#6548E8]">{eyebrow}</p>}
        <h1 className={`${eyebrow ? 'mt-1.5' : ''} text-[24px] font-black tracking-[-0.04em] md:text-[28px]`}>{title}</h1>
        {description && (
          <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

export default AuthCard
