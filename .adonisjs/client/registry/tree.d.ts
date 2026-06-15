/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
  boards: {
    show: typeof routes['boards.show']
  }
  columns: {
    store: typeof routes['columns.store']
    update: typeof routes['columns.update']
    destroy: typeof routes['columns.destroy']
  }
  groups: {
    store: typeof routes['groups.store']
    update: typeof routes['groups.update']
    destroy: typeof routes['groups.destroy']
  }
  cards: {
    store: typeof routes['cards.store']
    update: typeof routes['cards.update']
    destroy: typeof routes['cards.destroy']
  }
}
