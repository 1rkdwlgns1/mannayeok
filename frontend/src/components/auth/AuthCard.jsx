function AuthCard({ eyebrow, title, description, children }) {
  return (
    <section className="w-full max-w-[390px] rounded-[24px] border border-[#E2DCFF] bg-white/95 p-5 shadow-[0_16px_50px_rgba(75,55,160,0.10)] backdrop-blur md:p-7">
      <div>
        <p className="text-xs font-extrabold text-[#6548E8]">{eyebrow}</p>
        <h1 className="mt-1.5 text-[25px] font-black tracking-[-0.04em] md:text-[29px]">{title}</h1>
        {description && (
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

export default AuthCard
