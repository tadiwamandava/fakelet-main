import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../store/authStore'
import logo from '../assets/k20center-logo-full.svg'

const inputClass =
  'w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-brand'
const labelClass =
  'block text-xs font-semibold uppercase tracking-wide text-muted mb-1'

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const invKey   = params.get('key') ?? ''
  const emailHint = params.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')

  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)

  if (!invKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-4">
        <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 w-full max-w-sm shadow-sm text-center">
          <img src={logo} alt="K20 Center" className="h-10 mx-auto mb-4" />
          <p className="text-sm text-brand font-medium mb-2">No invitation key found</p>
          <p className="text-xs text-muted mb-4">
            Please use the link from your invitation email. If you don't have one, ask an admin to send you an invite.
          </p>
          <Link to="/login" className="text-xs text-muted hover:text-brand">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  async function handleSignup() {
    if (password.length < 8)  return setError('Password must be at least 8 characters.')
    if (password.length > 32) return setError('Password must be 32 characters or fewer.')
    if (password !== confirm)  return setError('Passwords do not match.')

    setError('')
    setBusy(true)
    try {
      await signup({ password, passwordConfirmation: confirm, invitationKey: invKey })
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
        <div className="flex justify-center mb-6">
          <span className="text-xs text-muted border border-line rounded-full px-3 py-1">Create your admin account</span>
        </div>

        {emailHint && (
          <div className="mb-4 px-3 py-2 bg-paper border border-line rounded-lg">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-0.5">Signing up as</p>
            <p className="text-sm text-ink truncate">{emailHint}</p>
          </div>
        )}

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
          onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
          autoComplete="new-password"
          className={inputClass}
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
