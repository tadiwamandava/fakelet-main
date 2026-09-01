import { useState } from 'react'
import { router } from '@inertiajs/react'
import { clientUid } from '~/lib/realtime'

type Method = 'post' | 'put' | 'delete'

interface MutateOptions<TResult> {
  onSuccess?: (result: TResult) => void
  onError?: (errors: Record<string, string>) => void
  /**
   * The write was refused because another editor got there first. Distinct
   * from onError, which means the submission itself was invalid.
   */
  onConflict?: (message: string) => void
}

/**
 * The slice of TanStack Query's useMutation that this app actually used.
 *
 * Every call site only ever touched `.mutate(vars, { onSuccess })` and
 * `.isPending`, so matching just those two keeps Card, Column, Group,
 * CardEditor, BoardSettingsModal and Sidebar working unchanged.
 */
export interface Mutation<TVars, TResult = unknown> {
  mutate: (vars: TVars, options?: MutateOptions<TResult>) => void
  isPending: boolean
}

interface Request {
  method: Method
  url: string
  data?: Record<string, any>
  /** Send as multipart, required when the payload contains a File. */
  forceFormData?: boolean
}

/**
 * Turns an Inertia visit into a TanStack-shaped mutation.
 *
 * An Inertia write returns no response body — the server redirects and the page
 * re-renders with fresh props. Where a caller needs something back (a new
 * card's id, an uploaded imageUrl) the controller flashes it as `created`, and
 * that value is handed to onSuccess so those call sites read the same as before.
 */
export function useVisitMutation<TVars, TResult = unknown>(
  build: (vars: TVars) => Request
): Mutation<TVars, TResult> {
  const [isPending, setIsPending] = useState(false)

  function mutate(vars: TVars, options?: MutateOptions<TResult>) {
    const { method, url, data, forceFormData } = build(vars)

    setIsPending(true)
    router[method](url, data ?? {}, {
      /**
       * preserveState keeps component state across the write. Without it every
       * save would remount the board and wipe edit mode, the search box, open
       * modals and collapsed groups.
       */
      preserveState: true,
      preserveScroll: true,
      forceFormData,
      /**
       * Identifies this tab so the server can leave it out of the change
       * broadcast — the redirect below already returns fresh props, so being
       * told about your own write would only cost a redundant reload.
       */
      headers: { 'X-Hive-Client': clientUid() },
      onSuccess: (page: any) => {
        /**
         * A refused write still redirects, so Inertia reports success — the
         * only signal is the flash. Routing it away from onSuccess is what
         * stops an editor closing (and discarding what the user typed) on a
         * save that never actually landed.
         */
        const conflict = page?.flash?.conflict
        if (conflict) {
          options?.onConflict?.(conflict as string)
          return
        }
        options?.onSuccess?.(page?.flash?.created as TResult)
      },
      onError: (errors: Record<string, string>) => {
        options?.onError?.(errors)
      },
      onFinish: () => setIsPending(false),
    })
  }

  return { mutate, isPending }
}
