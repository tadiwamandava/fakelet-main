/**
 * Vite asset imports used by the Inertia pages. They resolve to a URL string.
 *
 * This lives outside inertia/ because the generated .adonisjs/server/pages.d.ts
 * pulls the page components into the server's type program, which does not
 * include inertia/** on its own.
 */
declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.css' {}
