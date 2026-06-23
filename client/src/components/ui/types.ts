import type { UseMutationResult } from '@tanstack/react-query'

// ---------- domain data ----------

export interface CardData {
  id: number
  title: string
  description?: string | null
  imageUrl?: string | null
  youtubeUrl?: string | null
  linkUrl?: string | null
  linkTitle?: string | null
}

export interface GroupData {
  id: number
  title: string
  position?: number
  cards: CardData[]
}

export interface ColumnData {
  id: number
  title: string
  groups: GroupData[]
}

export interface BoardData {
  title: string
  imageUrl?: string | null
  references?: string[]
  columns?: ColumnData[] // full board carries these; Sidebar ignores them
}

// ---------- mutation payloads ----------

export interface CardCreateInput {
  groupId: number
  title: string
  position: number
}

export interface CardUpdateInput extends Partial<Omit<CardData, 'id'>> {
  id: number
}

export interface GroupCreateInput {
  columnId: number
  title: string
  position: number
}

export interface GroupUpdateInput {
  id: number
  title: string
}

export interface ColumnUpdateInput {
  id: number
  title: string
}

// ---------- mutation bundles (editable tree only) ----------

export interface CardMutations {
  createCard: UseMutationResult<CardData, Error, CardCreateInput>
  updateCard: UseMutationResult<CardData, Error, CardUpdateInput>
  deleteCard: UseMutationResult<void, Error, number>
}

export interface GroupMutations {
  createGroup: UseMutationResult<GroupData, Error, GroupCreateInput>
  updateGroup: UseMutationResult<GroupData, Error, GroupUpdateInput>
  deleteGroup: UseMutationResult<void, Error, number>
}

export interface ColumnMutations {
  updateColumn: UseMutationResult<ColumnData, Error, ColumnUpdateInput>
  deleteColumn: UseMutationResult<void, Error, number>
}