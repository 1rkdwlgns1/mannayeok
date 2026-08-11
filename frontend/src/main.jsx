import { StrictMode } from 'react'
import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const COLLABORATIVE_MEETINGS_ENABLED = false

export const LoginPage = lazy(() => import('./components/auth/LoginPage.jsx'))
export const SignupPage = lazy(() => import('./components/auth/SignupPage.jsx'))
export const ForgotPasswordPage = lazy(() => import('./components/auth/ForgotPasswordPage.jsx'))
export const ResetPasswordPage = lazy(() => import('./components/auth/ResetPasswordPage.jsx'))
export const VerifyEmailPage = lazy(() => import('./components/auth/VerifyEmailPage.jsx'))
export const LegalDocumentPage = lazy(() => import('./components/legal/LegalDocumentPage.jsx'))
export const AccountPage = lazy(() => import('./components/account/AccountPage.jsx'))
export const SavedMeetingsPage = lazy(() => import('./components/account/SavedMeetingsPage.jsx'))
export const MeetingInvitePage = lazy(() => import('./components/meeting/MeetingInvitePage.jsx'))
export const ChangePasswordPage = lazy(() => import('./components/account/ChangePasswordPage.jsx'))
export const DeleteAccountPage = lazy(() => import('./components/account/DeleteAccountPage.jsx'))
export const SocialSignupPage = lazy(() => import('./components/auth/SocialSignupPage.jsx'))
export const AdminNoticePage = lazy(() => import('./components/admin/AdminNoticePage.jsx'))
export const AdminVerificationPage = lazy(() => import('./components/admin/AdminVerificationPage.jsx'))

const pages = {
  '/login': LoginPage,
  '/signup': SignupPage,
  '/forgot-password': ForgotPasswordPage,
  '/reset-password': ResetPasswordPage,
  '/verify-email': VerifyEmailPage,
  '/terms': LegalDocumentPage,
  '/privacy': LegalDocumentPage,
  '/account': AccountPage,
  '/account/meetings': SavedMeetingsPage,
  '/account/password': ChangePasswordPage,
  '/account/delete': DeleteAccountPage,
  '/signup/social': SocialSignupPage,
  '/admin/notices': AdminNoticePage,
  '/admin/verify': AdminVerificationPage,
}
const Page = pages[window.location.pathname]
  || (COLLABORATIVE_MEETINGS_ENABLED && /^\/meet\/[^/]+$/.test(window.location.pathname)
    ? MeetingInvitePage
    : App)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <Page />
    </Suspense>
  </StrictMode>,
)
