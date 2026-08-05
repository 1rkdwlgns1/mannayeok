import { useState } from 'react'
import { CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldAlert, Trash2 } from 'lucide-react'
import AuthCard from '../auth/AuthCard.jsx'
import AuthField from '../auth/AuthField.jsx'
import AuthLayout from '../auth/AuthLayout.jsx'
import { deleteMember } from '../../services/authApi.js'
import { clearAuth, getAccessToken, getStoredMember } from '../../services/authStorage.js'

const CONFIRMATION_TEXT = '회원탈퇴'

function DeleteAccountPage() {
  const member = getStoredMember()
  const accessToken = getAccessToken()
  const [currentPassword, setCurrentPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [deletionConfirmed, setDeletionConfirmed] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteComplete, setDeleteComplete] = useState(false)

  if ((!member || !accessToken) && !deleteComplete) {
    window.location.replace('/login')
    return null
  }

  const confirmationMatches = confirmationText === CONFIRMATION_TEXT
  const confirmationError = confirmationText && !confirmationMatches
    ? '회원탈퇴를 정확히 입력해 주세요.'
    : ''
  const formValid = Boolean(currentPassword) && deletionConfirmed && confirmationMatches

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!formValid || submitting) return

    setSubmitting(true)
    setPasswordError('')
    setRequestError('')
    try {
      await deleteMember({
        currentPassword,
        deletionConfirmed,
        confirmationText,
      }, accessToken)
      localStorage.removeItem('mannayeok:recent-origins')
      clearAuth()
      setDeleteComplete(true)
    } catch (error) {
      const message = error.message || '탈퇴 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'
      if (message.includes('비밀번호') || message.includes('재시도')) {
        setPasswordError(message)
      } else {
        setRequestError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout backTo="/account" backLabel="계정 관리로 돌아가기" wide compactFooter>
      {deleteComplete ? (
        <AuthCard
          eyebrow="탈퇴 완료"
          title="회원탈퇴가 완료됐어요"
          description="계정 정보와 비밀번호 재설정 정보가 삭제됐어요."
          wide
          centered
        >
          <div className="mt-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
            </div>
            <a
              href="/"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#6548E8] text-[15px] font-black text-white shadow-sm transition hover:bg-[#5639DC]"
            >
              메인 화면으로 이동
            </a>
          </div>
        </AuthCard>
      ) : (
        <section className="w-full max-w-[520px] rounded-[22px] border border-red-100 bg-white/95 p-4 shadow-[0_18px_55px_rgba(75,55,160,0.11)] backdrop-blur sm:rounded-[26px] sm:p-5">
          <header className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <ShieldAlert className="h-5 w-5" strokeWidth={2.3} aria-hidden="true" />
            </div>
            <h1 className="mt-2 text-[24px] font-black tracking-[-0.04em] text-slate-950 sm:text-[27px]">회원탈퇴</h1>
            <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">탈퇴 전에 삭제되는 정보를 확인해 주세요.</p>
          </header>

          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3.5">
            <p className="text-sm font-black text-red-800">탈퇴하면 다음 정보가 삭제됩니다.</p>
            <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-red-800/80 sm:text-sm">
              <li>• 계정, 이메일, 비밀번호 및 가입 동의 기록</li>
              <li>• 비밀번호 재설정 토큰</li>
              <li>• 이 기기에 저장된 최근 출발지</li>
            </ul>
            <p className="mt-2 border-t border-red-100 pt-2 text-xs font-black leading-5 text-red-700 sm:text-sm">
              삭제된 계정과 정보는 복구할 수 없습니다.
            </p>
          </div>

          <form className="mt-4 text-left" onSubmit={handleSubmit} noValidate>
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-900">
              <LockKeyhole className="h-4 w-4 text-slate-500" strokeWidth={2.2} aria-hidden="true" />
              <h2>본인 확인</h2>
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/45 p-3.5">
            <AuthField
              label="현재 비밀번호"
              error={passwordError}
              type={passwordVisible ? 'text' : 'password'}
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value)
                setPasswordError('')
                setRequestError('')
              }}
              placeholder="현재 비밀번호를 입력해 주세요"
              autoComplete="current-password"
              trailing={(
                <button
                  type="button"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-red-600"
                  aria-label={passwordVisible ? '현재 비밀번호 숨기기' : '현재 비밀번호 보기'}
                >
                  {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
              required
            />

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold leading-5 text-slate-700">
              <input
                type="checkbox"
                checked={deletionConfirmed}
                onChange={(event) => {
                  setDeletionConfirmed(event.target.checked)
                  setRequestError('')
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
              />
              삭제되는 정보와 복구할 수 없다는 내용을 확인했습니다.
            </label>

            <div>
              <label htmlFor="delete-confirmation" className="text-sm font-black text-slate-800">
                확인을 위해 <span className="text-red-600">회원탈퇴</span>를 입력해 주세요.
              </label>
              <input
                id="delete-confirmation"
                type="text"
                value={confirmationText}
                onChange={(event) => {
                  setConfirmationText(event.target.value)
                  setRequestError('')
                }}
                autoComplete="off"
                aria-invalid={Boolean(confirmationError)}
                className={`mt-2 h-11 w-full rounded-xl border bg-white px-3.5 text-sm font-bold outline-none transition focus:ring-2 focus:ring-red-100 ${confirmationError ? 'border-red-400' : 'border-slate-200 focus:border-red-300'}`}
                placeholder="회원탈퇴"
              />
              {confirmationError && (
                <p className="mt-1.5 text-xs font-bold text-red-500" role="alert">{confirmationError}</p>
              )}
            </div>
            </div>

            {requestError && (
              <p className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-bold leading-5 text-red-600" role="alert">
                {requestError}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <a
                href="/account"
                className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-[15px] font-black text-slate-700 transition hover:bg-slate-50"
              >
                취소
              </a>
              <button
                type="submit"
                disabled={!formValid || submitting}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-[15px] font-black text-white shadow-sm transition ${
                  formValid && !submitting
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'cursor-not-allowed bg-red-200'
                }`}
              >
                <Trash2 className="h-4 w-4" strokeWidth={2.3} aria-hidden="true" />
                {submitting ? '탈퇴 처리 중...' : '회원탈퇴'}
              </button>
            </div>
          </form>
        </section>
      )}
    </AuthLayout>
  )
}

export default DeleteAccountPage
