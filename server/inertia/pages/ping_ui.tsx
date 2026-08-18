import { Head, usePage } from '@inertiajs/react'

/**
 * Temporary smoke-test page for the Inertia pipeline (Phase 2). Delete once the
 * real pages land in Phases 3-6.
 */
export default function PingUi() {
  const { props } = usePage()

  return (
    <main id="main-content" className="min-h-dvh bg-paper flex items-center justify-center p-8">
      <Head title="Ping" />
      <div className="bg-white border border-line rounded-2xl shadow-sm p-8 max-w-lg w-full">
        <h1 className="font-serif text-xl text-ink mb-1">Inertia is running</h1>
        <p className="text-sm text-muted mb-4">
          Edge layout, Vite assets, Tailwind theme and shared props are all wired up.
        </p>
        <pre className="bg-paper border border-line rounded-lg p-3 text-xs overflow-x-auto">
          {JSON.stringify(props, null, 2)}
        </pre>
      </div>
    </main>
  )
}
