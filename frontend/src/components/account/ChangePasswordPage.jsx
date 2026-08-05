import { useState } from 'react'
import { CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import AuthCard from '../auth/AuthCard.jsx'
import AuthField from '../auth/AuthField.jsx'
import AuthLayout from '../auth/AuthLayout.jsx'
import { changePassword } from '../../services/authApi.js'
import { clearAuth, getAccessToken, getStoredMember } from '../../services/authStorage.js'

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/

function PasswordToggle({ visible, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-[#6548E8]"
      aria-label={visible ? `${label} 숨기기` : `${label} 보기`}
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )
}

function ChangePasswordPage() {
  const member = getStoredMember()
  const accessToken = getAccessToken()
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    passwordConfirm: '',
  })
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [changeComplete, setChangeComplete] = useState(false)

  if ((!member || !accessToken) && !changeComplete) {
    window.location.replace('/login')
    return null
  }

  const passwordValid = PASSWORD_PATTERN.test(form.newPassword)
  const passwordConfirmValid = Boolean(form.passwordConfirm)
    && form.newPassword === form.passwordConfirm
  const passwordChanged = Boolean(form.newPassword)
    && form.currentPassword !== form.newPassword
  const formValid = Boolean(form.currentPassword)
    && passwordValid
    && passwordConfirmValid
    && passwordChanged

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  const toggleVisibility = (field) => {
    setVisible((current) => ({ ...current, [field]: !current[field] }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!formValid || submitting) return

    setSubmitting(true)
    setError('')
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }, accessToken)
      clearAuth()
      setChangeComplete(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout backTo="/account" backLabel="계정 관리로 돌아가기" wide compactFooter>
      {changeComplete ? (
        <AuthCard
          eyebrow="변경 완료"
          title="비밀번호가 변경됐어요"
          description="계정 보호를 위해 로그아웃했어요. 새 비밀번호로 다시 로그인해 주세요."
          wide
          centered
        >
          <div className="mt-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
            </div>
            <a
              href="/login?passwordChanged=complete"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#6548E8] text-[15px] font-black text-white shadow-sm transition hover:bg-[#5639DC]"
            >
              로그인하러 가기
            </a>
          </div>
        </AuthCard>
      ) : (
      <AuthCard
        eyebrow="계정 보안"
        title="비밀번호를 변경해요"
        description="현재 비밀번호를 확인한 뒤 새 비밀번호를 설정해 주세요."
        wide
        centered
      >
        <form className="mt-5 space-y-3 text-left" onSubmit={handleSubmit} noValidate>
          <AuthField
            label="현재 비밀번호"
            icon={LockKeyhole}
            type={visible.current ? 'text' : 'password'}
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleChange}
            placeholder="현재 비밀번호를 입력해 주세요"
            autoComplete="current-password"
            trailing={(
              <PasswordToggle
                visible={visible.current}
                onToggle={() => toggleVisibility('current')}
                label="현재 비밀번호"
              />
            )}
            required
          />
          <AuthField
            label="새 비밀번호"
            icon={LockKeyhole}
            type={visible.next ? 'text' : 'password'}
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            placeholder="영문과 숫자를 포함한 8자 이상"
            autoComplete="new-password"
            message={form.newPassword && !passwordChanged
              ? '현재 비밀번호와 다른 비밀번호를 입력해 주세요.'
              : '영문과 숫자를 포함한 8자 이상 입력해 주세요.'}
            messageTone={!form.newPassword
              ? 'neutral'
              : passwordValid && passwordChanged ? 'success' : 'error'}
            trailing={(
              <PasswordToggle
                visible={visible.next}
                onToggle={() => toggleVisibility('next')}
                label="새 비밀번호"
              />
            )}
            required
          />
          <AuthField
            label="새 비밀번호 확인"
            icon={LockKeyhole}
            type={visible.confirm ? 'text' : 'password'}
            name="passwordConfirm"
            value={form.passwordConfirm}
            onChange={handleChange}
            placeholder="새 비밀번호를 다시 입력해 주세요"
            autoComplete="new-password"
            message={form.passwordConfirm
              ? passwordConfirmValid
                ? '비밀번호가 일치해요.'
                : '비밀번호가 일치하지 않아요.'
              : ''}
            messageTone={passwordConfirmValid ? 'success' : 'error'}
            trailing={(
              <PasswordToggle
                visible={visible.confirm}
                onToggle={() => toggleVisibility('confirm')}
                label="새 비밀번호 확인"
              />
            )}
            required
          />

          {error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-3 text-xs font-bold leading-5 text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!formValid || submitting}
            className={`h-11 w-full rounded-xl text-[15px] font-black text-white shadow-sm transition ${
              formValid && !submitting
                ? 'bg-[#6548E8] hover:bg-[#5639DC]'
                : 'cursor-default bg-[#CFC5FF]'
            }`}
          >
            {submitting ? '변경 처리 중...' : '비밀번호 변경'}
          </button>
        </form>
      </AuthCard>
      )}
    </AuthLayout>
  )
}

export default ChangePasswordPage
