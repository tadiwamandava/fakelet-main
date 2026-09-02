import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { ArrowLeft, Check, Copy, KeyRound, LogOut, Mail, ScrollText, Shield, ShieldMinus, ShieldOff, ShieldPlus, Trash2, Users } from 'lucide-react'
import { useAuth } from '~/lib/auth'
import Modal from '~/components/ui/Modal'
import HiveBanner from '~/components/ui/HiveBanner'
import logo from '~/assets/k20center-logo-full.svg'

type Invitation = {
  id: number
  key: string
  email: string | null
  createdAt: string | null
  createdBy: { id: number; email: string } | null
  usedAt: string | null
  usedBy: number | null
}

type AdminUser = {
  id: number
  email: string
  isAdmin: boolean
  isMasterAdmin: boolean
  createdAt: string | null
}

type AuditEntry = {
  id: number
  action: string
  summary: string
  actorEmail: string | null
  createdAt: string | null
}

type Tab = 'invitations' | 'users' | 'activity'

const TAB_LABELS: Record<Tab, string> = {
  invitations: 'Invitations',
  users: 'Users',
  activity: 'Activity',
}

type AdminProps = {
  invitations: Invitation[]
  users: AdminUser[]
  /** Empty for ordinary admins — the server does not send it to them. */
  auditLog: AuditEntry[]
}

export default function AdminIndex({ invitations, users, auditLog }: AdminProps) {
  const { user } = useAuth()
  const isMaster = !!user?.isMasterAdmin
  const [tab, setTab] = useState<Tab>('invitations')

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <Head title={`${TAB_LABELS[tab]} · Admin`} />
      <header className="relative isolate overflow-hidden bg-white border-b border-line px-4 sm:px-8 py-3 flex items-center gap-4 shrink-0">
        <HiveBanner />
        <div className="flex items-center gap-3 flex-1">
          <Link
            href="/boards"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-brand transition-colors"
          >
            <ArrowLeft size={13} />
            Boards
          </Link>
          <h1 className="text-sm font-semibold text-ink">Admin Dashboard</h1>
        </div>
        <div
          className="relative flex flex-col items-center shrink-0 px-8"
          style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 55%, rgba(255,255,255,0) 82%)' }}
        >
          <img src={logo} alt="K20 Center" className="h-9" />
          <p className="text-xs font-bold text-brand uppercase mt-1" style={{ letterSpacing: '2.2em', paddingLeft: '2.2em' }}>Hive</p>
        </div>
        <div className="flex items-center flex-1 justify-end">
          <span className="text-xs text-muted hidden sm:block">
            {user?.email}
            <span className="ml-1.5 bg-blue/10 text-blue text-[10px] font-medium px-1.5 py-0.5 rounded">Admin</span>
          </span>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 p-6 sm:p-8 max-w-3xl mx-auto w-full outline-none">
        <div className="flex gap-1 bg-white border border-line rounded-lg p-1 mb-6 w-fit">
          {([
            { key: 'invitations', label: 'Invitations', icon: KeyRound, master: false },
            { key: 'users', label: 'Users', icon: Users, master: false },
            // Who changed whose access is the master's business alone.
            { key: 'activity', label: 'Activity', icon: ScrollText, master: true },
          ] as const)
            .filter(({ master }) => !master || isMaster)
            .map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-md transition-colors ${
                tab === key ? 'bg-brand text-white font-medium' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'invitations' && <InvitationsTab invitations={invitations} />}
        {tab === 'users' && (
          <UsersTab users={users} currentUserId={user?.id ?? 0} isMaster={isMaster} />
        )}
        {tab === 'activity' && isMaster && <ActivityTab entries={auditLog} />}
      </main>
    </div>
  )
}

function InvitationsTab({ invitations }: { invitations: Invitation[] }) {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [sendError, setSendError] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const send = {
    isPending: sending,
    isSuccess: sentOk,
    mutate: (email: string) =>
      router.post('/admin/invitations', { email }, {
        preserveState: true,
        preserveScroll: true,
        onStart: () => { setSending(true); setSentOk(false) },
        onSuccess: () => { setRecipientEmail(''); setSendError(''); setSentOk(true) },
        onError: (errs: Record<string, string>) => setSendError(errs.email ?? 'Failed to send invitation.'),
        onFinish: () => setSending(false),
      }),
  }

  const revoke = {
    isPending: revoking,
    mutate: (id: number) =>
      router.delete(`/admin/invitations/${id}`, {
        preserveState: true,
        preserveScroll: true,
        onStart: () => setRevoking(true),
        onFinish: () => setRevoking(false),
      }),
  }

  function handleSend() {
    const email = recipientEmail.trim()
    if (!email) return setSendError('Enter a recipient email.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return setSendError('Enter a valid email address.')
    send.mutate(email)
  }

  function copyKey(inv: Invitation) {
    navigator.clipboard.writeText(inv.key)
    setCopiedId(inv.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const pending = invitations.filter((i) => !i.usedAt)
  const used    = invitations.filter((i) => i.usedAt)

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-line rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ink mb-1">Send an invitation</h2>
        <p className="text-xs text-muted mb-4">
          A single-use key and signup link will be emailed to the recipient. They'll join as an admin.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => { setRecipientEmail(e.target.value); setSendError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="colleague@example.com"
            aria-label="Recipient email address"
            className="flex-1 bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            onClick={handleSend}
            disabled={send.isPending}
            className="flex items-center gap-1.5 text-sm font-medium bg-brand text-white rounded-lg px-4 py-2 disabled:opacity-50 shrink-0"
          >
            <Mail size={13} />
            {send.isPending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
        {sendError && <p className="text-xs text-brand mt-2">{sendError}</p>}
        {send.isSuccess && <p className="text-xs text-teal mt-2">Invitation sent!</p>}
      </div>

      {pending.length === 0 && used.length === 0 && (
        <p className="text-xs text-muted">No invitations yet.</p>
      )}

      {pending.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Pending</h3>
          <div className="flex flex-col gap-2">
            {pending.map((inv) => (
              <div key={inv.id} className="bg-white border border-line rounded-lg px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{inv.email ?? '—'}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Sent {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}
                    {inv.createdBy && ` by ${inv.createdBy.email}`}
                  </p>
                </div>
                <code className="text-xs font-mono text-muted hidden sm:block shrink-0">{inv.key}</code>
                <button
                  onClick={() => copyKey(inv)}
                  title="Copy key"
                  className="text-muted hover:text-ink transition-colors p-1 shrink-0"
                >
                  {copiedId === inv.id ? <Check size={14} className="text-teal" /> : <Copy size={14} />}
                </button>
                <button
                  onClick={() => revoke.mutate(inv.id)}
                  disabled={revoke.isPending}
                  title="Revoke invitation"
                  className="text-muted hover:text-brand transition-colors p-1 shrink-0 disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {used.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Used</h3>
          <div className="flex flex-col gap-2">
            {used.map((inv) => (
              <div key={inv.id} className="bg-paper border border-line rounded-lg px-4 py-3 flex items-center gap-3 opacity-60">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{inv.email ?? '—'}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Used {inv.usedAt ? new Date(inv.usedAt).toLocaleDateString() : ''}
                  </p>
                </div>
                <span className="text-[10px] font-medium text-muted border border-line rounded px-1.5 py-0.5 shrink-0">
                  Used
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function UsersTab({
  users,
  currentUserId,
  isMaster,
}: {
  users: AdminUser[]
  currentUserId: number
  /** Only master admins may grant or revoke access; everyone else reads. */
  isMaster: boolean
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const [togglingAdmin, setTogglingAdmin] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [togglingMaster, setTogglingMaster] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const signOut = {
    isPending: signingOut,
    mutate: (id: number) =>
      router.post(`/admin/users/${id}/sign-out`, {}, {
        preserveState: true,
        preserveScroll: true,
        onStart: () => setSigningOut(true),
        onFinish: () => setSigningOut(false),
      }),
  }

  const toggleAdmin = {
    isPending: togglingAdmin,
    mutate: (id: number) =>
      router.patch(`/admin/users/${id}/admin`, {}, {
        preserveState: true,
        preserveScroll: true,
        onStart: () => setTogglingAdmin(true),
        onFinish: () => setTogglingAdmin(false),
      }),
  }

  const toggleMaster = {
    isPending: togglingMaster,
    mutate: (id: number) =>
      router.patch(`/admin/users/${id}/master`, {}, {
        preserveState: true,
        preserveScroll: true,
        onStart: () => setTogglingMaster(true),
        onFinish: () => setTogglingMaster(false),
      }),
  }

  const deleteUser = {
    isPending: deleting,
    mutate: (id: number) =>
      router.delete(`/admin/users/${id}`, {
        preserveState: true,
        preserveScroll: true,
        onStart: () => setDeleting(true),
        onSuccess: () => setConfirmDeleteId(null),
        onFinish: () => setDeleting(false),
      }),
  }

  const toDelete = users?.find((u) => u.id === confirmDeleteId)

  return (
    <div className="flex flex-col gap-4">
      {users.length === 0 && <p className="text-xs text-muted">No users found.</p>}

      {users.length > 0 && (
        <div className="flex flex-col gap-2">
          {users.map((u) => {
            const isMe = u.id === currentUserId
            return (
              <div key={u.id} className="bg-white border border-line rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand/10 text-brand text-xs font-semibold flex items-center justify-center shrink-0">
                  {u.email.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-ink truncate">{u.email}</span>
                    {u.isMasterAdmin ? (
                      <span className="bg-brand/10 text-brand text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0">
                        Master admin
                      </span>
                    ) : (
                      u.isAdmin && (
                        <span className="bg-blue/10 text-blue text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0">Admin</span>
                      )
                    )}
                    {isMe && (
                      <span className="text-[10px] text-muted shrink-0">(you)</span>
                    )}
                  </div>
                  <p className="text-xs text-muted truncate">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</p>
                </div>
                {/*
                  Granting and revoking access is master-only, and the server
                  enforces that on both surfaces — hiding the controls here just
                  spares ordinary admins buttons that would always be refused.
                */}
                {isMaster && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleMaster.mutate(u.id)}
                      disabled={isMe || toggleMaster.isPending}
                      title={u.isMasterAdmin ? 'Remove master admin' : 'Make master admin'}
                      className="p-1.5 text-muted hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded"
                    >
                      {u.isMasterAdmin ? <ShieldMinus size={15} /> : <ShieldPlus size={15} />}
                    </button>
                    <button
                      onClick={() => toggleAdmin.mutate(u.id)}
                      disabled={isMe || u.isMasterAdmin || toggleAdmin.isPending}
                      title={
                        u.isMasterAdmin
                          ? 'Remove master access first'
                          : u.isAdmin
                            ? 'Remove admin'
                            : 'Make admin'
                      }
                      className="p-1.5 text-muted hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded"
                    >
                      {u.isAdmin ? <ShieldOff size={15} /> : <Shield size={15} />}
                    </button>
                    {/*
                      Allowed on your own account: signing yourself out
                      everywhere after losing a device is the case this is for,
                      and it grants nothing.
                    */}
                    <button
                      onClick={() =>
                        window.confirm(
                          `Sign ${u.email} out of every browser session and revoke their API tokens?`
                        ) && signOut.mutate(u.id)
                      }
                      disabled={signOut.isPending}
                      title="Sign out everywhere"
                      className="p-1.5 text-muted hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded"
                    >
                      <LogOut size={15} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(u.id)}
                      disabled={isMe}
                      title="Delete user"
                      className="p-1.5 text-muted hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete user"
      >
        <p className="text-sm text-muted mb-4">
          Permanently delete <strong className="text-ink">{toDelete?.email}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="text-sm text-muted px-4 py-2 rounded-lg hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={() => confirmDeleteId !== null && deleteUser.mutate(confirmDeleteId)}
            disabled={deleteUser.isPending}
            className="text-sm bg-brand text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {deleteUser.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

/**
 * Who changed whose access, newest first.
 *
 * Read-only and deliberately plain: the value is in being able to answer "who
 * removed this person" months later, not in filtering or charts.
 */
function ActivityTab({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-xs text-muted">No access changes recorded yet.</p>
  }

  return (
    <ol className="flex flex-col gap-2">
      {entries.map((e) => (
        <li key={e.id} className="bg-white border border-line rounded-xl px-4 py-3">
          <p className="text-sm text-ink">{e.summary}</p>
          <p className="text-xs text-muted mt-0.5">
            {e.actorEmail ?? 'A deleted account'}
            {e.createdAt ? ` · ${new Date(e.createdAt).toLocaleString()}` : ''}
          </p>
        </li>
      ))}
    </ol>
  )
}
