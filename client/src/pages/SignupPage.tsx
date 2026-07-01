import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../store/authStore'
import logo from '../assets/k20center-logo-full.svg'

const inputClass =
  'w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-brand'
const labelClass =
  'block text-xs font-semibold uppercase tracking-wide text-muted mb-1'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [username, setUsername]   = useState('')
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [invKey, setInvKey]       = useState(params.get('key') ?? '')

  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)

  async function handleSignup() {
    if (username.trim().length < 3)   return setError('Username must be at least 3 characters.')
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address.')
    if (password.length < 8)          return setError('Password must be at least 8 characters.')
    if (password.length > 32)         return setError('Password must be 32 characters or fewer.')
    if (password !== confirm)         return setError('Passwords do not match.')
    if (!invKey.trim())               return setError('An invitation key is required.')

    setError('')
    setBusy(true)
    try {
      await signup({
        username: username.trim(),
        fullName: fullName.trim() || null,
        email: email.trim(),
        password,
        passwordConfirmation: confirm,
        invitationKey: invKey.trim(),
      })
      navigate('/boards')
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { errors?: { message: string }[] } } }
      const msg = anyErr?.response?.data?.errors?.[0]?.message
      setError(msg || 'Something went wrong — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 w-full max-w-sm shadow-sm">
        <img src={logo} alt="K20 Center" className="h-10 mx-auto mb-3" />
        <div className="flex justify-center mb-3">
          <p className="text-xs font-bold text-brand uppercase mt-1" style={{ letterSpacing: '3.9em', paddingLeft: '3.8em' }}>Hive</p>
        </div>
        <p className="text-sm text-muted text-center mb-6">Create your admin account</p>

        <label className={labelClass}>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className={inputClass}
        />

        <label className={labelClass}>Full name <span className="normal-case font-normal text-muted">(optional)</span></label>
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

        <label className={labelClass}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className={inputClass}
        />

        <label className={labelClass}>Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className={inputClass}
        />

        <label className={labelClass}>Invitation key</label>
        <input
          value={invKey}
          onChange={(e) => setInvKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
          placeholder="Paste your invitation key"
          autoComplete="off"
          className={`${inputClass} font-mono tracking-wide`}
        />

        {error && <p className="text-xs text-brand mb-3">{error}</p>}

        <button
          onClick={handleSignup}
          disabled={busy}
          className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 mt-1"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>

        <Link
          to="/login"
          className="block w-full text-xs text-muted mt-3 hover:text-brand text-center"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  )
}
