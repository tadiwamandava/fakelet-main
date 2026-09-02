import { useVisitMutation } from '~/lib/mutations'
import type { CardCreateInput, CardUpdateInput } from '~/components/Card'

/**
 * All board writes, expressed as Inertia visits.
 *
 * Every export keeps the name and `{ mutate, isPending }` shape it had under
 * TanStack Query, so the components consuming them are unchanged. The
 * invalidation that used to follow each write is gone: the server redirects
 * back to the page and Inertia returns fresh props automatically.
 */

/** Positions are assigned by the server, so creates never send one. */
interface ColumnCreateInput {
  boardId: number
  title: string
}

interface ColumnUpdateInput {
  id: number
  title: string
}

interface GroupCreateInput {
  columnId: number
  title: string
}

interface GroupUpdateInput {
  id: number
  title: string
}

export function useCardMutations(_boardId: number) {
  return {
    // Returns the new card's id via flash, so the editor can auto-open on it.
    createCard: useVisitMutation<CardCreateInput, { id: number }>((data) => ({
      method: 'post',
      url: '/cards',
      data,
    })),
    updateCard: useVisitMutation<CardUpdateInput>(({ id, ...data }) => ({
      method: 'put',
      url: `/cards/${id}`,
      data,
    })),
    deleteCard: useVisitMutation<number>((id) => ({
      method: 'delete',
      url: `/cards/${id}`,
    })),
    /**
     * One container's full contents after a drop. Sending the parent alongside
     * the order means a drag into another group or column is the same request
     * as a reorder in place.
     */
    reorderCards: useVisitMutation<{ groupId?: number; columnId?: number; ids: number[] }>(
      (data) => ({ method: 'post', url: '/cards/reorder', data })
    ),
    uploadImage: useUploadCardImage(_boardId),
    uploadAttachment: useUploadCardAttachment(),
    deleteAttachment: useDeleteCardAttachment(),
  }
}

/** Attaches a document (pdf/doc/slides/sheet) to a card. */
export function useUploadCardAttachment() {
  return useVisitMutation<{ cardId: number; file: File }, { id: number }>(({ cardId, file }) => ({
    method: 'post',
    url: `/cards/${cardId}/attachments`,
    data: { file },
    forceFormData: true,
  }))
}

export function useDeleteCardAttachment() {
  return useVisitMutation<number>((id) => ({
    method: 'delete',
    url: `/cards/attachments/${id}`,
  }))
}

export function useColumnMutations(_boardId: number) {
  return {
    createColumn: useVisitMutation<ColumnCreateInput>((data) => ({
      method: 'post',
      url: '/columns',
      data,
    })),
    updateColumn: useVisitMutation<ColumnUpdateInput>(({ id, ...data }) => ({
      method: 'put',
      url: `/columns/${id}`,
      data,
    })),
    deleteColumn: useVisitMutation<number>((id) => ({
      method: 'delete',
      url: `/columns/${id}`,
    })),
    reorderColumns: useVisitMutation<{ boardId: number; ids: number[] }>((data) => ({
      method: 'post',
      url: '/columns/reorder',
      data,
    })),
  }
}

export function useGroupMutations(_boardId: number) {
  return {
    // Flashes the new group's id back, same as card creation.
    createGroup: useVisitMutation<GroupCreateInput, { id: number }>((data) => ({
      method: 'post',
      url: '/groups',
      data,
    })),
    updateGroup: useVisitMutation<GroupUpdateInput>(({ id, ...data }) => ({
      method: 'put',
      url: `/groups/${id}`,
      data,
    })),
    deleteGroup: useVisitMutation<number>((id) => ({
      method: 'delete',
      url: `/groups/${id}`,
    })),
    reorderGroups: useVisitMutation<{ columnId: number; ids: number[] }>((data) => ({
      method: 'post',
      url: '/groups/reorder',
      data,
    })),
  }
}

export function useUpdateBoard(boardId: number) {
  return useVisitMutation<string[]>((references) => ({
    method: 'put',
    url: `/boards/${boardId}`,
    data: { references },
  }))
}

// ── Board-level CRUD ─────────────────────────────────────────────────────────

interface BoardCreateInput {
  title: string
  description?: string
  imageUrl?: string
  /** Optional cover uploaded in the same request as the create. */
  image?: File | null
}

export function useCreateBoard() {
  return useVisitMutation<BoardCreateInput, { id: number }>((data) => ({
    method: 'post',
    url: '/boards',
    data,
    forceFormData: !!data.image,
  }))
}

export function useDeleteBoard() {
  return useVisitMutation<number>((id) => ({
    method: 'delete',
    url: `/boards/${id}`,
  }))
}

interface BoardMetaInput {
  title?: string
  imageUrl?: string | null
  description?: string | null
}

export function useUpdateBoardMeta(boardId: number) {
  return useVisitMutation<BoardMetaInput>((data) => ({
    method: 'put',
    url: `/boards/${boardId}`,
    data,
  }))
}

/**
 * Image uploads flash back { imageUrl } so the editor can preview the stored
 * file immediately.
 */
export function useUploadCardImage(_boardId: number) {
  return useVisitMutation<{ cardId: number; file: File }, { imageUrl: string }>(
    ({ cardId, file }) => ({
      method: 'post',
      url: `/cards/${cardId}/image`,
      data: { image: file },
      forceFormData: true,
    })
  )
}

export function useUploadBoardImage(boardId: number) {
  return useVisitMutation<File, { imageUrl: string }>((file) => ({
    method: 'post',
    url: `/boards/${boardId}/image`,
    data: { image: file },
    forceFormData: true,
  }))
}
