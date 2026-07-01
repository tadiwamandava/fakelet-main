import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/authStore'
import logo from '../assets/k20center-logo-full.svg'

type Mode = 'login' | 'signup' | 'forgot' | 'reset'

const inputClass =
  'w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-brand'
const labelClass =
  'block text-xs font-semibold uppercase tracking-wide text-muted mb-1'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function LoginPage() {
  const { login, signup, forgotPassword, resetPassword } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('login')

  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [fullName, setFullName] = useState('')

  const [invitationKey, setInvitationKey] = useState('')

  const [code, setCode]             = useState('')
  const [resetEmail, setResetEmail] = useState('')

  const [error, setError] = useState('')
  const [info, setInfo]   = useState('')
  const [busy, setBusy]   = useState(false)

  function go(next: Mode) {
    setMode(next)
    setError('')
    setInfo('')
  }

  async function run(fn: () => Promise<void>) {
    setError('')
    setInfo('')
    setBusy(true)
    try {
      await fn()
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { errors?: { message: string }[] } } }
      const msg = anyErr?.response?.data?.errors?.[0]?.message
      setError(msg || 'Something went wrong — please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleLogin() {
    if (!username.trim()) return setError('Username is required.')
    if (!password)        return setError('Password is required.')
    await run(async () => { await login(username.trim(), password); navigate('/boards') })
  }

  async function handleSignup() {
    if (username.trim().length < 3)   return setError('Username must be at least 3 characters.')
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address.')
    if (password.length < 8)          return setError('Password must be at least 8 characters.')
    if (password.length > 32)         return setError('Password must be 32 characters or fewer.')
    if (password !== confirm)         return setError('Passwords do not match.')
    await run(async () => {
      await signup({ username: username.trim(), fullName: fullName.trim() || null, email: email.trim(), password, passwordConfirmation: confirm, invitationKey: invitationKey.trim() || undefined })
      navigate('/boards')
    })
  }

  async function handleForgot() {
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address.')
    await run(async () => {
      await forgotPassword(email.trim())
      setResetEmail(email.trim())
      setInfo('If that email is registered, a 6-digit code has been sent. Check your inbox.')
      go('reset')
    })
  }

  async function handleReset() {
    if (!/^\d{6}$/.test(code))  return setError('Enter the 6-digit code from the email.')
    if (password.length < 8)    return setError('New password must be at least 8 characters.')
    if (password.length > 32)   return setError('Password must be 32 characters or fewer.')
    if (password !== confirm)   return setError('Passwords do not match.')
    await run(async () => {
      await resetPassword({ email: resetEmail, code, password, passwordConfirmation: confirm })
      setInfo('Password updated! You can now sign in.')
      go('login')
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 w-full max-w-sm shadow-sm">
        <img src={logo} alt="K20 Center" className="h-10 mx-auto mb-3" />
        <div className="flex justify-center mb-3">
          <p className="text-xs font-bold text-brand uppercase mt-1" style={{ letterSpacing: '3.9em', paddingLeft: '3.8em' }}>Hive</p>
        </div>

        {(mode === 'login' || mode === 'signup') && (
          <>
            <p className="text-sm text-muted text-center mb-6">
              {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
            </p>

            <div className="flex gap-1 bg-paper border border-line rounded-lg p-1 mb-6">
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => go(m)}
                  className={`flex-1 text-sm py-1.5 rounded-md ${
                    mode === m ? 'bg-white text-ink shadow-sm font-medium' : 'text-muted'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <label className={labelClass}>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className={inputClass}
            />

            {mode === 'signup' && (
              <>
                <label className={labelClass}>Full name (optional)</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className={inputClass}
                />

                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  className={inputClass}
                />
              </>
            )}

            <label className={labelClass}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => mode === 'login' && e.key === 'Enter' && handleLogin()}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={inputClass}
            />

            {mode === 'signup' && (
              <>
                <label className={labelClass}>Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className={inputClass}
                />

                <label className={labelClass}>Admin invitation key <span className="normal-case font-normal text-muted">(optional)</span></label>
                <input
                  value={invitationKey}
                  onChange={(e) => setInvitationKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                  placeholder="Leave blank for a regular account"
                  autoComplete="off"
                  className={inputClass}
                />
              </>
            )}

            {error && <p className="text-xs text-brand mb-3">{error}</p>}

            <button
              onClick={mode === 'login' ? handleLogin : handleSignup}
              disabled={busy}
              className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 mt-1"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create account'}
            </button>

            {mode === 'login' && (
              <button
                onClick={() => { go('forgot'); setEmail('') }}
                className="w-full text-xs text-muted mt-3 hover:text-brand text-center"
              >
                Forgot password?
              </button>
            )}
          </>
        )}

        {mode === 'forgot' && (
          <>
            <p className="text-sm text-muted text-center mb-6">
              Enter your email and we'll send a reset code.
            </p>

            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

            <button onClick={() => go('login')} className="w-full text-xs text-muted mt-3 hover:text-brand text-center">
              Back to sign in
            </button>
          </>
        )}

        {mode === 'reset' && (
          <>
            <p className="text-sm text-muted text-center mb-1">Enter the code sent to</p>
            <p className="text-sm font-medium text-ink text-center mb-6 truncate">{resetEmail}</p>

            {info && <p className="text-xs text-teal mb-3">{info}</p>}

            <label className={labelClass}>6-digit code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className={`${inputClass} tracking-widest text-center text-lg font-semibold`}
            />

            <label className={labelClass}>New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />

            <label className={labelClass}>Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
              onClick={() => { go('forgot'); setCode(''); setPassword(''); setConfirm('') }}
              className="w-full text-xs text-muted mt-3 hover:text-brand text-center"
            >
              Resend code
            </button>
          </>
        )}

        {mode === 'login' && info && (
          <p className="text-xs text-teal mt-3 text-center">{info}</p>
        )}
      </div>
    </div>
  )
}
