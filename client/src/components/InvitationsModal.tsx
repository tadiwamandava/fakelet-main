import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Plus, Trash2 } from 'lucide-react'
import api from '../api/client'
import Modal from './ui/Modal'

interface Invitation {
  id: number
  key: string
  createdAt: string
  createdBy: { id: number; username: string } | null
  usedAt: string | null
  usedBy: number | null
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function InvitationsModal({ open, onClose }: Props) {
  const qc = useQueryClient()
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const { data: invitations, isLoading } = useQuery<Invitation[]>({
    queryKey: ['invitations'],
    queryFn: async () => {
      const res = await api.get<Invitation[]>('/invitations')
      return res.data
    },
    enabled: open,
  })

  const create = useMutation({
    mutationFn: async () => {
      const res = await api.post<Invitation>('/invitations')
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  })

  const revoke = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/invitations/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  })

  function copyKey(inv: Invitation) {
    navigator.clipboard.writeText(inv.key)
    setCopiedId(inv.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <Modal open={open} onClose={onClose} title="Admin invitations">
      <div className="flex flex-col gap-4 min-w-0">
        <p className="text-xs text-muted leading-relaxed">
          Each key is single-use. Share it with the person you want to add as admin — they enter it during sign-up.
        </p>

        <button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="flex items-center gap-1.5 self-start text-xs font-medium bg-brand text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
        >
          <Plus size={13} />
          {create.isPending ? 'Generating…' : 'Generate new key'}
        </button>

        {isLoading && <p className="text-xs text-muted">Loading…</p>}

        {invitations && invitations.length === 0 && (
          <p className="text-xs text-muted">No invitations yet.</p>
        )}

        {invitations && invitations.length > 0 && (
          <div className="flex flex-col gap-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  inv.usedAt ? 'border-line bg-paper opacity-60' : 'border-line bg-white'
                }`}
              >
                <code className="flex-1 text-xs font-mono text-ink truncate">{inv.key}</code>

                {inv.usedAt ? (
                  <span className="text-[10px] text-muted whitespace-nowrap shrink-0">Used</span>
                ) : (
                  <>
                    <button
                      onClick={() => copyKey(inv)}
                      aria-label="Copy key"
                      className="shrink-0 text-muted hover:text-ink transition-colors p-1"
                    >
                      {copiedId === inv.id ? <Check size={13} className="text-teal" /> : <Copy size={13} />}
                    </button>
                    <button
                      onClick={() => revoke.mutate(inv.id)}
                      disabled={revoke.isPending}
                      aria-label="Revoke"
                      className="shrink-0 text-muted hover:text-brand transition-colors p-1 disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
