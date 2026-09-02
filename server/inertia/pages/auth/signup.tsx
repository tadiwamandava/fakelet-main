import { useState } from 'react'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import HiveBanner from '~/components/ui/HiveBanner'
import logo from '~/assets/k20center-logo-full.svg'

const inputClass =
  'w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-brand'
const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-muted mb-1'

interface SignupProps {
  invitationKey: string
  /** Address the invitation was sent to; the account is always created with it. */
  email: string
  /** False when the key is missing, unknown, or already redeemed. */
  valid: boolean
}

export default function Signup({ invitationKey, email, valid }: SignupProps) {
  const { props } = usePage<{ errors: Record<string, string> }>()
  const serverErrors = props.errors ?? {}

  const [localError, setLocalError] = useState('')

  const form = useForm({
    invitationKey,
    password: '',
    passwordConfirmation: '',
  })

  function handleSignup() {
    if (form.data.password.length < 8) return setLocalError('Password must be at least 8 characters.')
    if (form.data.password.length > 32) return setLocalError('Password must be 32 characters or fewer.')
    if (form.data.password !== form.data.passwordConfirmation) {
      return setLocalError('Passwords do not match.')
    }
    setLocalError('')
    form.post('/signup')
  }

  /**
   * The server resolves the invitation before rendering, so an unusable key
   * shows this state immediately rather than only after submitting.
   */
  if (!valid) {
    return (
      <main
        id="main-content"
        className="relative isolate overflow-hidden min-h-dvh flex items-center justify-center bg-paper px-4"
      >
        <Head title="Create your account" />
        <HiveBanner variant="radial" minimal opacity={0.7} />
        <div className="relative z-10 bg-white border border-line rounded-2xl p-6 sm:p-8 w-full max-w-sm shadow-sm text-center">
          <img src={logo} alt="K20 Center" className="h-10 mx-auto mb-4" />
          <p className="text-sm text-brand font-medium mb-2">
            {invitationKey ? 'This invitation is no longer valid' : 'No invitation key found'}
          </p>
          <p className="text-xs text-muted mb-4">
            {invitationKey
              ? 'It may have already been used. Ask an admin to send you a new invite.'
              : "Please use the link from your invitation email. If you don't have one, ask an admin to send you an invite."}
          </p>
          <Link href="/login" className="text-xs text-muted hover:text-brand">
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  const error = localError || serverErrors.password || serverErrors.invitationKey || ''

  return (
    <main
      id="main-content"
      className="relative isolate overflow-hidden min-h-dvh flex items-center justify-center bg-paper px-4"
    >
      <Head title="Create your account" />
      <HiveBanner variant="radial" minimal opacity={0.7} />

      <div className="relative z-10 bg-white border border-line rounded-2xl p-6 sm:p-8 w-full max-w-sm shadow-sm">
        <img src={logo} alt="K20 Center" className="h-10 mx-auto mb-3" />
        <div className="flex justify-center mb-3">
          <p
            className="text-xs font-bold text-brand uppercase mt-1"
            style={{ letterSpacing: '3.9em', paddingLeft: '3.8em' }}
          >
            Hive
          </p>
        </div>
        <div className="flex justify-center mb-6">
          <span className="text-xs text-muted border border-line rounded-full px-3 py-1">
            Create your admin account
          </span>
        </div>

        {email && (
          <div className="mb-4 px-3 py-2 bg-paper border border-line rounded-lg">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-0.5">
              Signing up as
            </p>
            <p className="text-sm text-ink truncate">{email}</p>
          </div>
        )}

        <label htmlFor="signup-password" className={labelClass}>Password</label>
        <input
          id="signup-password"
          type="password"
          value={form.data.password}
          onChange={(e) => form.setData('password', e.target.value)}
          autoComplete="new-password"
          className={inputClass}
        />

        <label htmlFor="signup-confirm" className={labelClass}>Confirm password</label>
        <input
          id="signup-confirm"
          type="password"
          value={form.data.passwordConfirmation}
          onChange={(e) => form.setData('passwordConfirmation', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
          autoComplete="new-password"
          className={inputClass}
        />

        {error && <p className="text-xs text-brand mb-3">{error}</p>}

        <button
          onClick={handleSignup}
          disabled={form.processing}
          className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 mt-1"
        >
          {form.processing ? 'Creating account…' : 'Create account'}
        </button>

        <Link
          href="/login"
          className="block w-full text-xs text-muted mt-3 hover:text-brand text-center"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </main>
  )
}
