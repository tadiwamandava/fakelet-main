import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import type { CardData, CardCreateInput, CardUpdateInput } from '~/components/Card'
import type { ColumnData, ColumnMutations, GroupData, GroupMutations } from '~/components/Column'
import type { Board, BoardSummary } from './useBoard'

interface ColumnCreateInput {
  boardId: number
  title: string
  position: number
}

interface ColumnUpdateInput {
  id: number
  title: string
}

interface GroupCreateInput {
  columnId: number
  title: string
  position: number
}

interface GroupUpdateInput {
  id: number
  title: string
}

function useBoardMutation<TData, TVariables>(
  fn: (vars: TVariables) => Promise<TData>,
  boardId: number
) {
  const qc = useQueryClient()
  return useMutation<TData, Error, TVariables>({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  })
}

export function useCardMutations(boardId: number) {
  return {
    createCard: useBoardMutation<CardData, CardCreateInput>(
      (data) => api.post<CardData>('/cards', data).then((r) => r.data),
      boardId
    ),
    updateCard: useBoardMutation<CardData, CardUpdateInput>(
      ({ id, ...data }) => api.put<CardData>(`/cards/${id}`, data).then((r) => r.data),
      boardId
    ),
    deleteCard: useBoardMutation<void, number>(
      (id) => api.delete(`/cards/${id}`).then(() => undefined),
      boardId
    ),
    reorderCards: useBoardMutation<void, number[]>(
      (ids) => api.post('/cards/reorder', { ids }).then(() => undefined),
      boardId
    ),
    uploadImage: useUploadCardImage(boardId),
  }
}

export function useColumnMutations(boardId: number): { createColumn: ReturnType<typeof useBoardMutation<ColumnData, ColumnCreateInput>>} & ColumnMutations {
  return {
    createColumn: useBoardMutation<ColumnData, ColumnCreateInput>(
      (data) => api.post<ColumnData>('/columns', data).then((r) => r.data),
      boardId
    ),
    updateColumn: useBoardMutation<ColumnData, ColumnUpdateInput>(
      ({ id, ...data }) => api.put<ColumnData>(`/columns/${id}`, data).then((r) => r.data),
      boardId
    ),
    deleteColumn: useBoardMutation<void, number>(
      (id) => api.delete(`/columns/${id}`).then(() => undefined),
      boardId
    ),
  }
}

export function useGroupMutations(boardId: number): GroupMutations & { createGroup: ReturnType<typeof useBoardMutation<GroupData, GroupCreateInput>> } {
  return {
    createGroup: useBoardMutation<GroupData, GroupCreateInput>(
      (data) => api.post<GroupData>('/groups', data).then((r) => r.data),
      boardId
    ),
    updateGroup: useBoardMutation<GroupData, GroupUpdateInput>(
      ({ id, ...data }) => api.put<GroupData>(`/groups/${id}`, data).then((r) => r.data),
      boardId
    ),
    deleteGroup: useBoardMutation<void, number>(
      (id) => api.delete(`/groups/${id}`).then(() => undefined),
      boardId
    ),
  }
}

export function useUpdateBoard(boardId: number) {
  const qc = useQueryClient()
  return useMutation<Board, Error, string[]>({
    mutationFn: (references) =>
      api.put<Board>(`/boards/${boardId}`, { references }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  })
}

// ── Board-level CRUD ─────────────────────────────────────────────────────────

export function useCreateBoard() {
  const qc = useQueryClient()
  return useMutation<BoardSummary, Error, { title: string; description?: string; imageUrl?: string }>({
    mutationFn: (data) => api.post<BoardSummary>('/boards', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

// Upload a cover image to a board by id (used right after creating a board,
// when the id isn't known until the create request resolves).
export function useUploadImageToBoard() {
  const qc = useQueryClient()
  return useMutation<{ imageUrl: string }, Error, { boardId: number; file: File }>({
    mutationFn: ({ boardId, file }) => {
      const form = new FormData()
      form.append('image', file)
      return api
        .post<{ imageUrl: string }>(`/boards/${boardId}/image`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

export function useDeleteBoard() {
  const qc = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: (id) => api.delete(`/boards/${id}`).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

interface BoardMetaInput {
  title?: string
  imageUrl?: string | null
  description?: string | null
}

export function useUpdateBoardMeta(boardId: number) {
  const qc = useQueryClient()
  return useMutation<Board, Error, BoardMetaInput>({
    mutationFn: (data) => api.put<Board>(`/boards/${boardId}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', boardId] })
      qc.invalidateQueries({ queryKey: ['boards'] })
    },
  })
}

export function useUploadCardImage(boardId: number) {
  const qc = useQueryClient()
  return useMutation<{ imageUrl: string }, Error, { cardId: number; file: File }>({
    mutationFn: ({ cardId, file }) => {
      const form = new FormData()
      form.append('image', file)
      return api
        .post<{ imageUrl: string }>(`/cards/${cardId}/image`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  })
}

export function useUploadBoardImage(boardId: number) {
  const qc = useQueryClient()
  return useMutation<{ imageUrl: string }, Error, File>({
    mutationFn: (file) => {
      const form = new FormData()
      form.append('image', file)
      return api
        .post<{ imageUrl: string }>(`/boards/${boardId}/image`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', boardId] })
      qc.invalidateQueries({ queryKey: ['boards'] })
    },
  })
}
