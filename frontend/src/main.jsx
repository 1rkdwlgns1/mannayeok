import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ForgotPasswordPage from './components/auth/ForgotPasswordPage.jsx'
import LoginPage from './components/auth/LoginPage.jsx'
import ResetPasswordPage from './components/auth/ResetPasswordPage.jsx'
import SignupPage from './components/auth/SignupPage.jsx'
import VerifyEmailPage from './components/auth/VerifyEmailPage.jsx'

const pages = {
  '/login': LoginPage,
  '/signup': SignupPage,
  '/forgot-password': ForgotPasswordPage,
  '/reset-password': ResetPasswordPage,
  '/verify-email': VerifyEmailPage,
}
const Page = pages[window.location.pathname] || App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
