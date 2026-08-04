import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Copy, KeyRound, Mail, Shield, ShieldOff, Trash2, Users } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../store/authStore'
import { useTitle } from '../hooks/useTitle'
import Modal from '../components/ui/Modal'
import HiveBackground from '../components/ui/HiveBackground'
import logo from '../assets/k20center-logo-full.svg'

interface Invitation {
  id: number
  key: string
  email: string | null
  createdAt: string
  createdBy: { id: number; email: string } | null
  usedAt: string | null
  usedBy: number | null
}

interface AdminUser {
  id: number
  email: string
  isAdmin: boolean
  createdAt: string
}

type Tab = 'invitations' | 'users'

export default function AdminPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('invitations')
  useTitle(`${tab === 'invitations' ? 'Invitations' : 'Users'} · Admin`)

  return (
    <div className="relative isolate min-h-screen bg-paper flex flex-col">
      <HiveBackground />
      <header className="bg-white border-b border-line px-4 sm:px-8 py-3 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <Link
            to="/boards"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-brand transition-colors"
          >
            <ArrowLeft size={13} />
            Boards
          </Link>
          <h1 className="text-sm font-semibold text-ink">Admin Dashboard</h1>
        </div>
        <div className="flex flex-col items-center shrink-0">
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
            { key: 'invitations', label: 'Invitations', icon: KeyRound },
            { key: 'users', label: 'Users', icon: Users },
          ] as const).map(({ key, label, icon: Icon }) => (
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

        {tab === 'invitations' && <InvitationsTab qc={qc} />}
        {tab === 'users' && <UsersTab qc={qc} currentUserId={user?.id ?? 0} />}
      </main>
    </div>
  )
}

function InvitationsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [sendError, setSendError] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const { data: invitations, isLoading } = useQuery<Invitation[]>({
    queryKey: ['invitations'],
    queryFn: async () => {
      const res = await api.get<Invitation[]>('/invitations')
      return res.data
    },
  })

  const send = useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post<Invitation>('/invitations', { email })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitations'] })
      setRecipientEmail('')
      setSendError('')
    },
    onError: (err: unknown) => {
      const anyErr = err as { response?: { data?: { error?: string } } }
      setSendError(anyErr?.response?.data?.error ?? 'Failed to send invitation.')
    },
  })

  const revoke = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/invitations/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  })

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

  const pending = invitations?.filter((i) => !i.usedAt) ?? []
  const used    = invitations?.filter((i) => i.usedAt)  ?? []

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

      {isLoading && <p className="text-xs text-muted">Loading…</p>}

      {!isLoading && pending.length === 0 && used.length === 0 && (
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
                    Sent {new Date(inv.createdAt).toLocaleDateString()}
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

function UsersTab({ qc, currentUserId }: { qc: ReturnType<typeof useQueryClient>; currentUserId: number }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const { data: users, isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get<AdminUser[]>('/admin/users')
      return res.data
    },
  })

  const toggleAdmin = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.patch<AdminUser>(`/admin/users/${id}/admin`)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/users/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setConfirmDeleteId(null)
    },
  })

  const toDelete = users?.find((u) => u.id === confirmDeleteId)

  return (
    <div className="flex flex-col gap-4">
      {isLoading && <p className="text-xs text-muted">Loading…</p>}
      {error && <p className="text-xs text-brand">Error loading users: {(error as Error).message}</p>}
      {!isLoading && !error && users && users.length === 0 && <p className="text-xs text-muted">No users found.</p>}

      {users && users.length > 0 && (
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
                    {u.isAdmin && (
                      <span className="bg-blue/10 text-blue text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0">Admin</span>
                    )}
                    {isMe && (
                      <span className="text-[10px] text-muted shrink-0">(you)</span>
                    )}
                  </div>
                  <p className="text-xs text-muted truncate">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleAdmin.mutate(u.id)}
                    disabled={isMe || toggleAdmin.isPending}
                    title={u.isAdmin ? 'Remove admin' : 'Make admin'}
                    className="p-1.5 text-muted hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded"
                  >
                    {u.isAdmin ? <ShieldOff size={15} /> : <Shield size={15} />}
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
