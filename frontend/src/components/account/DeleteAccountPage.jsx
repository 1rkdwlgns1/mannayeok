import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, ShieldAlert, Trash2 } from 'lucide-react'
import AuthField from '../auth/AuthField.jsx'
import AuthLayout from '../auth/AuthLayout.jsx'
import { deleteMember, deleteSocialMember } from '../../services/authApi.js'
import { clearAuth, getAccessToken, getStoredMember } from '../../services/authStorage.js'
import AnimatedLoadingDots from '../AnimatedLoadingDots.jsx'

const CONFIRMATION_TEXT = '회원탈퇴'

function DeleteAccountPage() {
  const member = getStoredMember()
  const accessToken = getAccessToken()
  const [currentPassword, setCurrentPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [deletionConfirmed, setDeletionConfirmed] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [confirmationTouched, setConfirmationTouched] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isSocialMember = ['KAKAO', 'NAVER'].includes(member?.loginProvider)

  if (!member || !accessToken) {
    window.location.replace('/login')
    return null
  }

  if (member.role === 'ADMIN') {
    window.location.replace('/account')
    return null
  }

  const confirmationMatches = confirmationText === CONFIRMATION_TEXT
  const confirmationError = confirmationTouched && !confirmationMatches
    ? '‘회원탈퇴’를 정확히 입력해 주세요.'
    : ''
  const formValid = deletionConfirmed
    && confirmationMatches
    && (isSocialMember || Boolean(currentPassword))
    && !submitting

  const handleConfirmationChange = (checked) => {
    setDeletionConfirmed(checked)
    setRequestError('')
    if (checked) return

    setCurrentPassword('')
    setPasswordVisible(false)
    setConfirmationText('')
    setConfirmationTouched(false)
    setPasswordError('')
  }

  const getRequestErrorMessage = (error) => {
    if (error.code === 'ADMIN_ACCOUNT_PROTECTED') {
      return '관리자 계정은 회원탈퇴할 수 없어요.'
    }
    if (error.code === 'KAKAO_UNLINK_FAILED' || error.code === 'KAKAO_UNLINK_NOT_CONFIGURED') {
      return '카카오 계정 연결 해제 중 문제가 발생했어요. 다시 시도해 주세요.'
    }
    if (error.code === 'NAVER_UNLINK_FAILED' || error.code === 'NAVER_LOGIN_NOT_CONFIGURED') {
      return '네이버 계정 연결 해제 중 문제가 발생했어요. 다시 시도해 주세요.'
    }
    return '회원탈퇴를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!formValid) return

    setSubmitting(true)
    setPasswordError('')
    setRequestError('')
    try {
      const payload = { deletionConfirmed, confirmationText }
      if (isSocialMember) {
        await deleteSocialMember(payload, accessToken)
      } else {
        await deleteMember({ ...payload, currentPassword }, accessToken)
      }
      localStorage.removeItem('mannayeok:recent-origins')
      clearAuth()
      window.location.replace('/')
    } catch (error) {
      if (error.code === 'CURRENT_PASSWORD_MISMATCH') {
        setPasswordError('현재 비밀번호가 일치하지 않아요.')
      } else if (error.code === 'TOO_MANY_REAUTH_ATTEMPTS') {
        setPasswordError('비밀번호 확인에 여러 번 실패했어요. 15분 후 다시 시도해 주세요.')
      } else {
        setRequestError(getRequestErrorMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout backTo="/account" backLabel="계정 관리로 돌아가기" wide compactFooter>
      <section className="w-full max-w-[520px] rounded-[22px] border border-red-100 bg-white/95 p-3.5 shadow-[0_18px_55px_rgba(75,55,160,0.11)] backdrop-blur sm:rounded-[26px] sm:p-4">
          <header className="text-center">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <ShieldAlert className="h-5 w-5" strokeWidth={2.3} aria-hidden="true" />
            </div>
            <h1 className="mt-1.5 text-[23px] font-black tracking-[-0.04em] text-slate-950 sm:text-[25px]">회원탈퇴</h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-[13px]">탈퇴 전에 삭제되는 정보를 확인해 주세요.</p>
          </header>

          <div className="mt-3 rounded-2xl border border-red-100 bg-red-50/45 px-3.5 py-3">
            <p className="text-xs font-black text-red-800 sm:text-[13px]">삭제되는 정보</p>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-600 sm:text-xs">
              계정 및 로그인 정보 · 가입 동의 기록 · 비밀번호 재설정 정보 · 이 기기의 최근 출발지
            </p>
            <p className="mt-2 border-t border-red-100 pt-2 text-[11px] font-black leading-4 text-red-700 sm:text-xs">
              탈퇴 후에는 계정과 정보를 복구할 수 없습니다.
            </p>
          </div>

          <form className="mt-3 text-left" onSubmit={handleSubmit} noValidate>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold leading-5 text-slate-700">
              <input
                type="checkbox"
                checked={deletionConfirmed}
                onChange={(event) => handleConfirmationChange(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
              />
              삭제되는 정보와 복구할 수 없다는 내용을 확인했습니다.
            </label>

            <div
              className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
                deletionConfirmed ? 'mt-3 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
              }`}
              aria-hidden={!deletionConfirmed}
            >
              <div className={`overflow-hidden ${deletionConfirmed ? 'visible' : 'invisible'}`}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="mb-2.5 flex items-center gap-2 text-[13px] font-black text-slate-900 sm:text-sm">
                    <LockKeyhole className="h-4 w-4 text-slate-500" strokeWidth={2.2} aria-hidden="true" />
                    <h2>본인 확인</h2>
                  </div>

                  <div className="space-y-2.5">
                    {!isSocialMember && <AuthField
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
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label={passwordVisible ? '현재 비밀번호 숨기기' : '현재 비밀번호 보기'}
                        >
                          {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                      required
                    />}

                    <div>
                      <label htmlFor="delete-confirmation" className="text-[13px] font-black text-slate-800 sm:text-sm">
                        확인을 위해 ‘회원탈퇴’를 입력해 주세요.
                      </label>
                      <input
                        id="delete-confirmation"
                        type="text"
                        value={confirmationText}
                        onChange={(event) => {
                          setConfirmationText(event.target.value)
                          setConfirmationTouched(Boolean(event.target.value))
                          setRequestError('')
                        }}
                        onBlur={() => setConfirmationTouched(true)}
                        autoComplete="off"
                        aria-invalid={Boolean(confirmationError)}
                        className={`mt-2 h-10 w-full rounded-xl border bg-white px-3.5 text-[13px] font-bold outline-none transition focus:ring-2 focus:ring-red-100 sm:h-11 sm:text-sm ${confirmationError ? 'border-red-400' : 'border-slate-200 focus:border-red-300'}`}
                        placeholder="회원탈퇴"
                      />
                      {confirmationError && (
                        <p className="mt-1.5 text-xs font-bold text-red-500" role="alert">{confirmationError}</p>
                      )}
                    </div>
                  </div>
                </div>

                {requestError && (
                  <p className="mt-2.5 px-1 text-xs font-bold leading-5 text-red-600" role="alert">
                    {requestError}
                  </p>
                )}

                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <a
                    href="/account"
                    className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[13px] font-black text-slate-700 transition hover:bg-slate-50 sm:text-sm"
                  >
                    취소
                  </a>
                  <button
                    type="submit"
                    disabled={!formValid}
                    className={`flex h-10 items-center justify-center gap-2 rounded-xl text-[13px] font-black text-white shadow-sm transition sm:text-sm ${
                      formValid
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'cursor-default bg-red-200'
                    }`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2.3} aria-hidden="true" />
                    {submitting ? <>탈퇴 처리 중<AnimatedLoadingDots /></> : '회원탈퇴'}
                  </button>
                </div>
              </div>
            </div>
          </form>
      </section>
    </AuthLayout>
  )
}

export default DeleteAccountPage
