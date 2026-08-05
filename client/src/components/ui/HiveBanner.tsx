interface HiveBannerProps {
  /** Extra classes for positioning/sizing (defaults to filling the nearest positioned parent) */
  className?: string
  /** Overall opacity of the decoration */
  opacity?: number
  /** Minimalist mode: outline hexagons only, no fills, no bees */
  minimal?: boolean
}

const GOLD = '#E8BF3D'
const FILL = '#F5DA8B'

type Hex = { cx: number; cy: number; r: number; kind: 'outline' | 'fill'; o: number }

// A scattered cluster of flat-top hexagons — bold gold outlines in the middle,
// soft pale fills and faint small ones spreading out to the sides.
const HEXES: Hex[] = [
  { cx: 600, cy: 45, r: 30, kind: 'outline', o: 1 },
  { cx: 600, cy: 42, r: 20, kind: 'fill', o: 0.3 },
  { cx: 505, cy: 42, r: 23, kind: 'outline', o: 0.9 },
  { cx: 700, cy: 40, r: 25, kind: 'outline', o: 0.85 },
  { cx: 560, cy: 55, r: 18, kind: 'fill', o: 0.5 },
  { cx: 655, cy: 56, r: 16, kind: 'fill', o: 0.45 },
  { cx: 455, cy: 56, r: 15, kind: 'fill', o: 0.4 },
  { cx: 750, cy: 52, r: 16, kind: 'fill', o: 0.35 },
  { cx: 400, cy: 44, r: 16, kind: 'outline', o: 0.5 },
  { cx: 805, cy: 44, r: 18, kind: 'outline', o: 0.5 },
  { cx: 330, cy: 50, r: 12, kind: 'fill', o: 0.3 },
  { cx: 865, cy: 48, r: 12, kind: 'fill', o: 0.3 },
  { cx: 280, cy: 42, r: 11, kind: 'outline', o: 0.35 },
  { cx: 915, cy: 44, r: 11, kind: 'outline', o: 0.35 },
  { cx: 220, cy: 48, r: 9, kind: 'fill', o: 0.22 },
  { cx: 965, cy: 46, r: 10, kind: 'fill', o: 0.22 },
  { cx: 165, cy: 45, r: 8, kind: 'outline', o: 0.25 },
  { cx: 1015, cy: 45, r: 9, kind: 'outline', o: 0.25 },
  { cx: 110, cy: 48, r: 7, kind: 'fill', o: 0.15 },
  { cx: 1065, cy: 47, r: 8, kind: 'fill', o: 0.15 },
]

function hexPoints(cx: number, cy: number, r: number): string {
  const a = r * 0.8660254 // r * sin(60°)
  const h = r * 0.5
  return `${cx + r},${cy} ${cx + h},${cy + a} ${cx - h},${cy + a} ${cx - r},${cy} ${cx - h},${cy - a} ${cx + h},${cy - a}`
}

// A small stylised bee: striped body, translucent wings, head and stinger.
function Bee({ x, y, rotate = 0, scale = 1 }: { x: number; y: number; rotate?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      {/* wings */}
      <ellipse cx="1" cy="-7" rx="7" ry="4.5" fill="#ffffff" fillOpacity="0.75" stroke="#4a4640" strokeWidth="0.7" transform="rotate(-18 1 -7)" />
      <ellipse cx="6" cy="-6" rx="6" ry="4" fill="#ffffff" fillOpacity="0.75" stroke="#4a4640" strokeWidth="0.7" transform="rotate(18 6 -6)" />
      {/* body */}
      <ellipse cx="0" cy="0" rx="10" ry="6.5" fill="#F5C842" stroke="#3a352f" strokeWidth="1" />
      {/* stripes */}
      <ellipse cx="-1" cy="0" rx="1.4" ry="6" fill="#3a352f" />
      <ellipse cx="3" cy="0" rx="1.4" ry="5.4" fill="#3a352f" />
      <ellipse cx="6.4" cy="0" rx="1.1" ry="3.9" fill="#3a352f" />
      {/* head */}
      <circle cx="-9" cy="0" r="3.6" fill="#3a352f" />
      {/* antennae */}
      <path d="M-11 -2 q -3 -3 -4.5 -1.5" stroke="#3a352f" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <path d="M-11 -0.5 q -3 -2 -5 -0.5" stroke="#3a352f" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      {/* stinger */}
      <path d="M10 0 l 4 0" stroke="#3a352f" strokeWidth="1" strokeLinecap="round" />
    </g>
  )
}

/**
 * A decorative "hive" banner — a scattered cluster of gold honeycomb hexagons
 * with a few bees, meant to sit behind a page's top header strip. Fades out at
 * the left/right edges so it blends into the bar. Purely decorative.
 *
 * Place inside an element made `relative isolate overflow-hidden`; it renders
 * behind that element's content (`-z-10`).
 */
export default function HiveBanner({ className = '', opacity = 0.9, minimal = false }: HiveBannerProps) {
  const edgeFade = 'linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%)'
  const hexes = minimal ? HEXES.filter((h) => h.kind === 'outline') : HEXES
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 ${className}`}
      style={{ opacity, WebkitMaskImage: edgeFade, maskImage: edgeFade }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1200 90"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {hexes.map((hx, i) =>
          hx.kind === 'outline' ? (
            <polygon
              key={i}
              points={hexPoints(hx.cx, hx.cy, hx.r)}
              fill="none"
              stroke={GOLD}
              strokeOpacity={minimal ? hx.o * 0.7 : hx.o}
              strokeWidth={Math.max(1.2, hx.r * 0.12)}
              strokeLinejoin="round"
            />
          ) : (
            <polygon key={i} points={hexPoints(hx.cx, hx.cy, hx.r)} fill={FILL} fillOpacity={hx.o} />
          )
        )}

        {!minimal && (
          <>
            <Bee x={445} y={20} rotate={-18} scale={1.15} />
            <Bee x={705} y={18} rotate={14} scale={1.05} />
            <Bee x={600} y={74} rotate={8} scale={1.1} />
            <Bee x={820} y={64} rotate={-12} scale={0.95} />
          </>
        )}
      </svg>
    </div>
  )
}
