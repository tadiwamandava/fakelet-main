import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import type { ColumnData } from '../components/Column'

export interface BoardSummary {
  id: number
  title: string
  imageUrl?: string | null
}

export interface Board extends BoardSummary {
  references?: string[]
  columns: ColumnData[]
}

export function useBoards() {
  return useQuery<BoardSummary[]>({
    queryKey: ['boards'],
    queryFn: async () => {
      const res = await api.get<BoardSummary[]>('/boards')
      return res.data
    },
  })
}

export function useBoard(boardId: number) {
  return useQuery<Board>({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const res = await api.get<Board>(`/boards/${boardId}`)
      return res.data
    },
  })
}
