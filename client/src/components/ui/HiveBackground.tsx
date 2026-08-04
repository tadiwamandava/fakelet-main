interface HiveBackgroundProps {
  /** Extra classes for positioning/sizing (defaults to filling the nearest positioned parent) */
  className?: string
  /** Honeycomb color (defaults to the K20 gold) */
  color?: string
  /** Opacity of the honeycomb lines */
  opacity?: number
}

/**
 * A decorative honeycomb ("hive") pattern that fades in from the top-right
 * corner and dissolves seamlessly toward the rest of the page.
 *
 * Technique: a seamless hexagon SVG is tiled as a repeating background, then a
 * radial-gradient mask (opaque at the top-right, transparent by ~60% out) makes
 * it fade with no visible edge. Purely decorative — non-interactive and hidden
 * from screen readers.
 *
 * Drop it inside any element that has `position: relative` (add `relative
 * overflow-hidden` to that element).
 */
export default function HiveBackground({
  className = '',
  color = '#E8BF3D',
  opacity = 0.4,
}: HiveBackgroundProps) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'>` +
    `<path fill='${color}' fill-opacity='${opacity}' d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/>` +
    `</svg>`

  const backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  // Opaque at the top-right corner, fading to nothing by ~60% of the radius.
  const fade =
    'radial-gradient(120% 120% at 100% 0%, #000 0%, rgba(0,0,0,0.55) 32%, transparent 62%)'

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 ${className}`}
      style={{
        backgroundImage,
        backgroundRepeat: 'repeat',
        WebkitMaskImage: fade,
        maskImage: fade,
      }}
    />
  )
}
