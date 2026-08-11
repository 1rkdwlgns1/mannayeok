import { useState } from 'react'
import { CheckCircle2, Send, X } from 'lucide-react'
import AnimatedLoadingDots from '../components/AnimatedLoadingDots'

const INQUIRY_TYPES = ['추천 오류', '역·상권 정보 오류', '기능 제안', '버그', '기타']

function InquiryDialog({ hasResult, onClose, onOpenPrivacy, onSubmit }) {
  const [type, setType] = useState(hasResult ? '추천 오류' : '기능 제안')
  const [message, setMessage] = useState('')
  const [replyEmail, setReplyEmail] = useState('')
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [status, setStatus] = useState({ phase: 'idle', message: '' })

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (status.phase === 'sending') return
    if (!privacyConsent) {
      setStatus({ phase: 'error', message: '개인정보 수집 및 이용에 동의해주세요.' })
      return
    }

    const formData = new FormData(event.currentTarget)
    setStatus({ phase: 'sending', message: '' })

    try {
      await onSubmit({
        type,
        message: message.trim(),
        replyEmail: replyEmail.trim(),
        website: String(formData.get('website') || ''),
      })
      setStatus({ phase: 'success', message: '소중한 의견을 보내주셔서 감사해요.' })
    } catch (error) {
      setStatus({
        phase: 'error',
        message: error instanceof Error ? error.message : '문의 전송에 실패했어요. 다시 시도해주세요.',
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center overflow-hidden overscroll-none bg-slate-950/35 px-3 py-2 backdrop-blur-[2px] md:px-4 md:pb-4 md:pt-10"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && status.phase !== 'sending') onClose()
      }}
    >
      <section
        className="max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-white/60 bg-white p-3 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:max-h-none md:overflow-y-visible md:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-dialog-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-[#5A45E8]">개발자에게 문의하기</p>
            <h2 id="inquiry-dialog-title" className="mt-1.5 text-lg font-black tracking-tight text-slate-950 md:mt-1 md:text-xl">
              만나역을 더 좋게 만들어주세요
            </h2>
            <p className="mt-0.5 break-keep text-[11px] leading-4 text-slate-500 md:mt-1 md:text-xs md:leading-5">
              불편했던 점이나 개선 아이디어를 남겨주시면 확인할게요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={status.phase === 'sending'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
            aria-label="문의하기 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {status.phase === 'success' ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-950">문의가 접수됐어요</h3>
            <p className="mt-1 text-sm text-slate-500">{status.message}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 h-11 w-full rounded-xl bg-[#5A45E8] text-sm font-black text-white transition hover:bg-[#4D39D4]"
            >
              닫기
            </button>
          </div>
        ) : (
          <form className="mt-2 md:mt-4" onSubmit={handleSubmit}>
            <fieldset>
              <legend className="text-xs font-black text-slate-800 md:text-sm">문의 유형</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 md:mt-2 md:gap-2">
                {INQUIRY_TYPES.map((inquiryType) => (
                  <label
                    key={inquiryType}
                    className={`flex min-h-8 cursor-pointer items-center justify-center rounded-lg border px-1 py-1 text-center text-[11px] font-bold leading-4 transition md:min-h-10 md:px-2 md:py-2 md:text-xs ${
                      type === inquiryType
                        ? 'border-violet-300 bg-violet-50 text-[#5A45E8]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={inquiryType}
                      checked={type === inquiryType}
                      onChange={() => setType(inquiryType)}
                      className="sr-only"
                    />
                    {inquiryType}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-2 block text-xs font-black text-slate-800 md:mt-4 md:text-sm" htmlFor="inquiry-message">
              문의 내용
            </label>
            <textarea
              id="inquiry-message"
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              minLength={1}
              maxLength={250}
              rows={4}
              placeholder="불편했던 점이나 개선했으면 하는 내용을 적어주세요."
              className="mt-1.5 h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-xs placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 md:mt-2 md:h-auto md:resize-y md:px-3.5 md:py-3 md:leading-6 md:placeholder:text-sm"
            />
            <p className="mt-1 text-right text-[11px] font-medium text-slate-400">{message.length}/250</p>

            <label className="mt-2 block text-xs font-black text-slate-800 md:mt-3 md:text-sm" htmlFor="inquiry-email">
              답변받을 이메일 <span className="font-medium text-slate-400">(선택)</span>
            </label>
            <input
              id="inquiry-email"
              name="replyEmail"
              type="email"
              value={replyEmail}
              onChange={(event) => setReplyEmail(event.target.value)}
              maxLength={200}
              placeholder="답변이 필요한 경우에만 입력해주세요."
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-800 outline-none transition placeholder:text-xs placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 md:mt-2 md:h-11 md:px-3.5 md:placeholder:text-sm"
            />

            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="inquiry-website">웹사이트</label>
              <input id="inquiry-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <p className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-[11px] font-bold leading-5 text-[#7868C8] md:mt-4">
              현재 출발지와 추천 결과가 문의에 자동으로 첨부돼요.
            </p>

            <div className="mt-3">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(event) => setPrivacyConsent(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#5A45E8]"
                  required
                />
                <span className="text-xs font-black leading-5 text-slate-700">
                  [필수] 개인정보 수집 및 이용에 동의합니다.
                </span>
              </label>
              <div className="ml-6 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-4 text-slate-500 md:gap-y-1">
                <span>문의·검색·접속 정보</span>
                <span aria-hidden="true">·</span>
                <span>접수일로부터 1년 보관</span>
                <span aria-hidden="true">·</span>
                <span>Google 인프라 처리</span>
                <span aria-hidden="true">·</span>
                <span>거부 시 문의 접수 제한</span>
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="font-black text-[#5A45E8] underline underline-offset-2"
                >
                  전문 보기
                </button>
              </div>
            </div>

            {status.phase === 'error' ? (
              <p className="mt-3 text-sm font-bold text-red-500" role="alert">
                {status.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={status.phase === 'sending' || !privacyConsent}
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#5A45E8] text-sm font-black text-white transition hover:bg-[#4D39D4] disabled:cursor-default disabled:bg-slate-300 md:sticky md:bottom-0 md:mt-4 md:h-11 md:shadow-[0_-8px_18px_rgba(255,255,255,0.96)]"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {status.phase === 'sending' ? <>보내는 중<AnimatedLoadingDots /></> : '문의 보내기'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

export default InquiryDialog
