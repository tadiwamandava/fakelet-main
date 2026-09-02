interface HiveBannerProps {
  /** Extra classes for positioning/sizing (defaults to filling the nearest positioned parent) */
  className?: string
  /** Overall opacity of the decoration */
  opacity?: number
  /** Minimalist mode: outline hexagons only, no fills, no bees */
  minimal?: boolean
  /**
   * `band` is the horizontal strip used along the top of a page.
   *
   * `radial` grows a honeycomb out from the middle instead, for pages built
   * around one centred panel — the pattern reads as continuing behind it.
   */
  variant?: 'band' | 'radial'
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

/**
 * Stable pseudo-random in [0,1) for a grid cell.
 *
 * The scatter has to be identical on the server and the client, and identical
 * between renders, or hexagons would jump around on hydration — so this is a
 * hash of the coordinates rather than Math.random.
 */
function noise(a: number, b: number): number {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return n - Math.floor(n)
}

/**
 * A honeycomb spreading out from the centre of a fixed square field.
 *
 * Tightly packed and strong in the middle, thinning and fading as it goes out,
 * so a panel sitting over the centre looks like it is covering more of the same
 * pattern rather than sitting on a decoration that stops at its edge.
 *
 * The field is a fixed pixel size drawn at 1:1 rather than stretched to cover
 * the page, for two reasons: it stays a halo hugging the panel instead of
 * wallpaper, and every screen gets the same cell size — scaling to cover made
 * the comb noticeably finer on a phone than on a desktop.
 */
/**
 * Field size in CSS pixels, drawn 1:1 and centred on the panel.
 *
 * The panel is 384px wide, so a 660 field puts roughly an inch and a bit of
 * comb around it. Tighter than this and the visible ring drops below a couple
 * of hexagons deep, which reads as scattered shapes rather than a honeycomb.
 */
const FIELD = 660
const CENTRE = FIELD / 2
const REACH = CENTRE

function radialHexes(): Hex[] {
  const r = 26
  const stepX = r * 1.5
  const stepY = r * Math.sqrt(3)
  const hexes: Hex[] = []

  for (let col = -10; col <= 10; col++) {
    for (let row = -9; row <= 9; row++) {
      const cx = CENTRE + col * stepX
      // Flat-top hexagons interlock by offsetting every other column half a step.
      const cy = CENTRE + row * stepY + (Math.abs(col) % 2 === 1 ? stepY / 2 : 0)

      const distance = Math.hypot(cx - CENTRE, cy - CENTRE)
      if (distance > REACH) continue

      const t = distance / REACH

      /**
       * The panel covers everything inside roughly 0.6 of the reach, so both
       * the thinning and the fade have to hold off until past that — decaying
       * from the centre would spend the whole effect where nothing can see it
       * and leave the visible ring almost blank.
       */
      const outer = t < 0.55 ? 0 : (t - 0.55) / 0.45

      const density = 1 - outer * 0.85
      if (noise(col, row) > density) continue

      hexes.push({
        cx,
        cy,
        r: r * (1 - t * 0.18),
        kind: noise(row * 7, col * 13) > 0.8 ? 'fill' : 'outline',
        o: (1 - outer) ** 1.4,
      })
    }
  }

  return hexes
}

const RADIAL_HEXES = radialHexes()

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
 * A decorative "hive" banner;
 * Place inside an element made `relative isolate overflow-hidden`; it renders
 * behind that element's content (`-z-10`).
 */
export default function HiveBanner({
  className = '',
  opacity = 0.9,
  minimal = false,
  variant = 'band',
}: HiveBannerProps) {
  const radial = variant === 'radial'

  /**
   * The band fades at its left and right ends; the radial field fades on every
   * side. Each hexagon already dims with distance from the centre, so this only
   * has to clear the outermost ring rather than carry the effect.
   */
  const fade = radial
    ? 'radial-gradient(circle at 50% 50%, #000 0%, #000 74%, transparent 100%)'
    : 'linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%)'

  const source = radial ? RADIAL_HEXES : HEXES
  const hexes = minimal ? source.filter((h) => h.kind === 'outline') : source

  /**
   * The band stretches to fill its container; the radial field is a fixed size
   * centred on it, so it stays a halo around the panel rather than growing to
   * wallpaper the page on a large screen.
   */
  const box = radial
    ? 'pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2'
    : 'pointer-events-none absolute inset-0 -z-10'

  return (
    <div
      aria-hidden="true"
      className={`${box} ${className}`}
      style={{
        opacity,
        WebkitMaskImage: fade,
        maskImage: fade,
        ...(radial ? { width: FIELD, height: FIELD } : {}),
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={radial ? `0 0 ${FIELD} ${FIELD}` : '0 0 1200 90'}
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

        {!minimal && !radial && (
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
