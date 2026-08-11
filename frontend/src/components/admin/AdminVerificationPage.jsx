import { useEffect, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import {
  getAdminVerificationStatus,
  saveAdminAccessToken,
  setupAdminSecondaryPassword,
  verifyAdminSecondaryPassword,
} from '../../services/adminAuth'
import { clearAuth, getAccessToken, getStoredMember } from '../../services/authStorage'
import AnimatedLoadingDots from '../AnimatedLoadingDots'
import AuthCard from '../auth/AuthCard'
import AuthField from '../auth/AuthField'
import AuthLayout from '../auth/AuthLayout'

const ADMIN_INQUIRY_SHEET_URL = String(import.meta.env.VITE_ADMIN_INQUIRY_SHEET_URL || '').trim()

function AdminVerificationPage() {
  const member = getStoredMember()
  const memberId = member?.id
  const memberRole = member?.role
  const accessToken = getAccessToken()
  const next = new URLSearchParams(window.location.search).get('next') === 'inquiries' ? 'inquiries' : 'notices'
  const [configured, setConfigured] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!memberId || !accessToken) {
      window.location.replace('/login')
      return
    }
    if (memberRole !== 'ADMIN') {
      window.location.replace('/')
      return
    }

    getAdminVerificationStatus(accessToken)
      .then((response) => setConfigured(response.configured))
      .catch((requestError) => {
        if (requestError.status === 401 || requestError.status === 403) {
          clearAuth()
          window.location.replace('/login')
          return
        }
        setError(requestError.message)
      })
  }, [accessToken, memberId, memberRole])

  const continueToAdmin = () => {
    if (next === 'inquiries' && ADMIN_INQUIRY_SHEET_URL) {
      window.location.replace(ADMIN_INQUIRY_SHEET_URL)
      return
    }
    window.location.replace('/admin/notices')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (password.length < 10) {
      setError('관리자 2차 비밀번호는 10자 이상 입력해 주세요.')
      return
    }
    if (configured === false && password !== confirmation) {
      setError('비밀번호 확인이 일치하지 않아요.')
      return
    }

    setSubmitting(true)
    try {
      const auth = configured
        ? await verifyAdminSecondaryPassword(password, accessToken)
        : await setupAdminSecondaryPassword({ password, passwordConfirmation: confirmation }, accessToken)
      saveAdminAccessToken(auth)
      continueToAdmin()
    } catch (requestError) {
      if (requestError.code === 'ADMIN_SECONDARY_PASSWORD_ALREADY_CONFIGURED') {
        setConfigured(true)
        setPassword('')
        setConfirmation('')
        setError('이미 설정되어 있어요. 2차 비밀번호를 다시 입력해 주세요.')
      } else if (requestError.code === 'ADMIN_SECONDARY_PASSWORD_MISMATCH') {
        setError('관리자 2차 비밀번호가 일치하지 않아요.')
      } else if (requestError.code === 'TOO_MANY_ADMIN_VERIFICATION_ATTEMPTS') {
        setError('확인에 여러 번 실패했어요. 15분 후 다시 시도해 주세요.')
      } else {
        setError(requestError.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!memberId || !accessToken || memberRole !== 'ADMIN') return null

  return (
    <AuthLayout wide compactFooter backText="홈으로">
      <AuthCard
        wide
        centered
        eyebrow={configured === false ? '최초 1회 설정' : '관리자 보안 확인'}
        title={configured === false ? '관리자 2차 비밀번호 설정' : '관리자 2차 인증'}
        description={configured === false
          ? '공지와 문의 관리에 사용할 별도의 비밀번호를 설정해 주세요.'
          : '관리자 기능을 계속 이용하려면 2차 비밀번호를 입력해 주세요.'}
      >
        {configured === null ? (
          error ? (
            <div className="mt-6 text-center">
              <p className="text-sm font-bold text-red-600" role="alert">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-[#6548E8]"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <p className="mt-6 text-center text-sm font-bold text-slate-500">
              관리자 설정 확인 중<AnimatedLoadingDots />
            </p>
          )
        ) : (
          <form className="mt-5 space-y-3 text-left" onSubmit={handleSubmit} noValidate>
            {configured === false ? (
              <div className="flex gap-2.5 rounded-xl bg-violet-50 px-3.5 py-3 text-xs font-semibold leading-5 text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#6548E8]" aria-hidden="true" />
                일반 로그인 비밀번호와 다른 비밀번호를 권장해요. 설정된 비밀번호는 암호화되어 저장됩니다.
              </div>
            ) : null}
            <AuthField
              dense
              label={configured === false ? '새 2차 비밀번호' : '관리자 2차 비밀번호'}
              icon={LockKeyhole}
              type={passwordVisible ? 'text' : 'password'}
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError('') }}
              placeholder="10자 이상 입력해 주세요"
              autoComplete="new-password"
              maxLength={72}
              required
              trailing={(
                <button type="button" onClick={() => setPasswordVisible((current) => !current)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-[#6548E8]" aria-label={passwordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}>
                  {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            />
            {configured === false ? (
              <AuthField
                dense
                label="새 2차 비밀번호 확인"
                icon={LockKeyhole}
                type={passwordVisible ? 'text' : 'password'}
                value={confirmation}
                onChange={(event) => { setConfirmation(event.target.value); setError('') }}
                placeholder="한 번 더 입력해 주세요"
                autoComplete="new-password"
                maxLength={72}
                required
              />
            ) : null}
            {error ? <p className="text-xs font-bold text-red-600" role="alert">{error}</p> : null}
            <button type="submit" disabled={submitting} className="h-10 w-full rounded-xl bg-[#6548E8] text-sm font-black text-white shadow-sm transition hover:bg-[#5639DC] disabled:cursor-wait disabled:opacity-60 sm:h-11 sm:text-[15px]">
              {submitting ? <>처리 중<AnimatedLoadingDots /></> : configured === false ? '설정하고 계속하기' : '확인'}
            </button>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  )
}

export default AdminVerificationPage
