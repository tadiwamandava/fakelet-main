import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

export function useBookmarks() {
  return useQuery<number[]>({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const res = await api.get<{ cardIds: number[] }>('/bookmarks')
      return res.data.cardIds
    },
  })
}

export function useToggleBookmark() {
  const qc = useQueryClient()
  return useMutation<{ bookmarked: boolean; cardId: number }, Error, number, { prev: number[] }>({
    mutationFn: (cardId) =>
      api.post<{ bookmarked: boolean; cardId: number }>('/bookmarks/toggle', { cardId }).then((r) => r.data),
    onMutate: async (cardId) => {
      await qc.cancelQueries({ queryKey: ['bookmarks'] })
      const prev = qc.getQueryData<number[]>(['bookmarks']) ?? []
      qc.setQueryData(
        ['bookmarks'],
        prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
      )
      return { prev }
    },
    onError: (_err, _cardId, context) => {
      if (context?.prev) qc.setQueryData(['bookmarks'], context.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  })
}
