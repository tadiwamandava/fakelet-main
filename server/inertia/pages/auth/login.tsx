import { useState } from 'react'
import { Head, useForm, usePage } from '@inertiajs/react'
import HiveBanner from '~/components/ui/HiveBanner'
import logo from '~/assets/k20center-logo-full.svg'

type Mode = 'login' | 'forgot' | 'reset'

const inputClass =
  'w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-brand'
const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-muted mb-1'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

interface LoginProps {
  redirect: string
}

export default function Login({ redirect }: LoginProps) {
  const { props } = usePage<{ errors: Record<string, string>; flash: Record<string, any> }>()
  const serverErrors = props.errors ?? {}
  const notice = props.flash?.notice as string | undefined

  const [mode, setMode] = useState<Mode>('login')

  // The email entered in "forgot" is carried into "reset" so the code form
  // knows which account it belongs to.
  const [resetEmail, setResetEmail] = useState('')
  const [localError, setLocalError] = useState('')

  const loginForm = useForm({ email: '', password: '', redirect })
  const forgotForm = useForm({ email: '' })
  const resetForm = useForm({ email: '', code: '', password: '', passwordConfirmation: '' })

  const busy = loginForm.processing || forgotForm.processing || resetForm.processing

  function go(next: Mode) {
    setMode(next)
    setLocalError('')
  }

  function handleLogin() {
    if (!loginForm.data.email.trim()) return setLocalError('Email is required.')
    if (!loginForm.data.password) return setLocalError('Password is required.')
    setLocalError('')
    loginForm.post('/login')
  }

  function handleForgot() {
    const email = forgotForm.data.email.trim()
    if (!EMAIL_RE.test(email)) return setLocalError('Please enter a valid email address.')
    setLocalError('')
    forgotForm.post('/forgot-password', {
      // Without this the page remounts and the email typed here is lost before
      // the reset step can use it.
      preserveState: true,
      onSuccess: () => {
        setResetEmail(email)
        resetForm.setData('email', email)
        go('reset')
      },
    })
  }

  function handleReset() {
    if (!/^\d{6}$/.test(resetForm.data.code)) return setLocalError('Enter the 6-digit code from the email.')
    if (resetForm.data.password.length < 8) return setLocalError('New password must be at least 8 characters.')
    if (resetForm.data.password.length > 32) return setLocalError('Password must be 32 characters or fewer.')
    if (resetForm.data.password !== resetForm.data.passwordConfirmation) {
      return setLocalError('Passwords do not match.')
    }
    setLocalError('')
    resetForm.post('/reset-password', { preserveState: true })
  }

  // Client-side validation wins while typing; otherwise show what the server said.
  const error =
    localError ||
    serverErrors.email ||
    serverErrors.code ||
    serverErrors.password ||
    ''

  return (
    <main
      id="main-content"
      className="relative isolate overflow-hidden min-h-dvh flex items-center justify-center bg-paper px-4"
    >
      <Head title={mode === 'login' ? 'Sign in' : 'Reset password'} />
      <HiveBanner variant="radial" minimal opacity={0.7} />

      <div className="relative z-10 bg-white border border-line rounded-2xl p-6 sm:p-8 w-full max-w-sm shadow-sm">
        <img src={logo} alt="K20 Center" className="h-10 mx-auto mb-3" />
        <div className="flex justify-center mb-6">
          <p
            className="text-xs font-bold text-brand uppercase mt-1"
            style={{ letterSpacing: '3.9em', paddingLeft: '3.8em' }}
          >
            Hive
          </p>
        </div>

        {mode === 'login' && (
          <>
            <div className="flex justify-center mb-6">
              <span className="text-xs text-muted border border-line rounded-full px-3 py-1">
                Admin sign in
              </span>
            </div>

            <label htmlFor="login-email" className={labelClass}>Email</label>
            <input
              id="login-email"
              type="email"
              value={loginForm.data.email}
              onChange={(e) => loginForm.setData('email', e.target.value)}
              autoComplete="email"
              inputMode="email"
              className={inputClass}
            />

            <label htmlFor="login-password" className={labelClass}>Password</label>
            <input
              id="login-password"
              type="password"
              value={loginForm.data.password}
              onChange={(e) => loginForm.setData('password', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              autoComplete="current-password"
              className={inputClass}
            />

            {error && <p className="text-xs text-brand mb-3">{error}</p>}
            {notice && <p className="text-xs text-teal mb-3 text-center">{notice}</p>}

            <button
              onClick={handleLogin}
              disabled={busy}
              className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 mt-1"
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>

            <button
              onClick={() => { go('forgot'); forgotForm.setData('email', '') }}
              className="w-full text-xs text-muted mt-3 hover:text-brand text-center"
            >
              Forgot password?
            </button>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <p className="text-sm text-muted text-center mb-6">
              Enter your email and we'll send a reset code.
            </p>

            <label htmlFor="forgot-email" className={labelClass}>Email</label>
            <input
              id="forgot-email"
              type="email"
              value={forgotForm.data.email}
              onChange={(e) => forgotForm.setData('email', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleForgot()}
              autoComplete="email"
              inputMode="email"
              className={inputClass}
            />

            {error && <p className="text-xs text-brand mb-3">{error}</p>}

            <button
              onClick={handleForgot}
              disabled={busy}
              className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send reset code'}
            </button>

            <button
              onClick={() => go('login')}
              className="w-full text-xs text-muted mt-3 hover:text-brand text-center"
            >
              Back to sign in
            </button>
          </>
        )}

        {mode === 'reset' && (
          <>
            <p className="text-sm text-muted text-center mb-1">Enter the code sent to</p>
            <p className="text-sm font-medium text-ink text-center mb-6 truncate">{resetEmail}</p>

            {notice && <p className="text-xs text-teal mb-3">{notice}</p>}

            <label htmlFor="reset-code" className={labelClass}>6-digit code</label>
            <input
              id="reset-code"
              value={resetForm.data.code}
              onChange={(e) => resetForm.setData('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className={`${inputClass} tracking-widest text-center text-lg font-semibold`}
            />

            <label htmlFor="reset-password" className={labelClass}>New password</label>
            <input
              id="reset-password"
              type="password"
              value={resetForm.data.password}
              onChange={(e) => resetForm.setData('password', e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />

            <label htmlFor="reset-confirm" className={labelClass}>Confirm new password</label>
            <input
              id="reset-confirm"
              type="password"
              value={resetForm.data.passwordConfirmation}
              onChange={(e) => resetForm.setData('passwordConfirmation', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReset()}
              autoComplete="new-password"
              className={inputClass}
            />

            {error && <p className="text-xs text-brand mb-3">{error}</p>}

            <button
              onClick={handleReset}
              disabled={busy}
              className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Set new password'}
            </button>

            <button
              onClick={() => { go('forgot'); resetForm.reset('code', 'password', 'passwordConfirmation') }}
              className="w-full text-xs text-muted mt-3 hover:text-brand text-center"
            >
              Resend code
            </button>
          </>
        )}
      </div>
    </main>
  )
}
