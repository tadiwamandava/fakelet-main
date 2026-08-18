import { Head, Link } from '@inertiajs/react'
import HiveBanner from '~/components/ui/HiveBanner'
import logo from '~/assets/k20center-logo-full.svg'

export default function ServerError() {
  return (
    <main
      id="main-content"
      className="relative isolate overflow-hidden min-h-dvh flex items-center justify-center bg-paper px-4"
    >
      <Head title="Something went wrong" />
      <HiveBanner minimal opacity={0.6} className="h-28 !bottom-auto" />

      <div className="relative z-10 bg-white border border-line rounded-2xl p-6 sm:p-8 w-full max-w-sm shadow-sm text-center">
        <img src={logo} alt="K20 Center" className="h-10 mx-auto mb-4" />
        <p className="text-sm text-ink font-medium mb-2">Something went wrong</p>
        <p className="text-xs text-muted mb-4">
          The error has been logged. Please try again in a moment.
        </p>
        <Link href="/boards" className="text-xs text-muted hover:text-brand">
          Go to boards
        </Link>
      </div>
    </main>
  )
}
