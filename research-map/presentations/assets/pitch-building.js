// The building of the pitch (deck 06): one point cloud, drawn on a canvas behind the slides, that is taken apart,
// masked and put back as the pitch goes. It is Autodesk's sample project (the pipeline's `source.rvt`), read from the
// deck's `model.json`. What it shows of the pipeline is real (levels as strata, element categories, the door and window
// hosts as edges); what is not built yet (a mask's prediction, MCP placement) is illustration, and the slide says so.
//
// This part is pure: sampling the model into points, the edges, and where each point should be in each phase. The canvas
// that tweens between phases is `mountBuilding`, below.

/** What a slide asks for with `data-phase`. */
export const PHASES = ['off', 'exploded', 'graph', 'masked', 'rebuilt', 'motif']

/** Where the building sits in the stage, as fractions of it, with `scale` its share of the stage's height (`data-place`). */
export const PLACES = {
  right: { cx: 0.68, cy: 0.5, scale: 0.9 },
  left: { cx: 0.3, cy: 0.5, scale: 0.9 },
  full: { cx: 0.5, cy: 0.5, scale: 1 },
  corner: { cx: 0.9, cy: 0.82, scale: 0.3 },
}

/** The place called `name`; anything unknown is the full one. */
export const placeOf = (name) => PLACES[name] ?? PLACES.full

/** easeInOutSine over [0, 1], clamped. */
export function ease(t) {
  const c = Math.min(Math.max(t, 0), 1)
  return (1 - Math.cos(Math.PI * c)) / 2
}

/** Index of the highest level at or below `z` (5 cm of slack, so a slab on a level is on it); 0 below them all. */
export function levelOf(z, levels) {
  let found = 0
  levels.forEach((l, i) => {
    if (l.z <= z + 0.05) found = i
  })
  return found
}

/** A stable stagger in [0, 1) from an element's id, so a phase change ripples instead of snapping. */
export function delayOf(pt) {
  return ((Math.imul(pt.id, 2654435761) >>> 0) % 1000) / 1000
}

/** The illustrative mask hides the openings (doors and windows): "a whole class", one of the options for step 04. */
export const isMasked = (pt) => pt.kind === 'door' || pt.kind === 'window'

const STEP = 0.9 // metres between sampled points on a wall
const GRID = 1.5 // metres between sampled points on a floor

const inside = (x, y, poly) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/**
 * The model as points: walls every 0.9 m along and up, floors on a 1.5 m grid, openings by their corners and centre,
 * rooms by one point. Each point knows its element (`id`, `kind`, `level`, centroid `cx, cy, cz`), and one per element
 * is `first`. Thinned to `max` by a fixed stride that keeps every element's first point; the same model always gives
 * the same points.
 * @returns {{ x: number, y: number, z: number, kind: string, id: number, level: number, cx: number, cy: number, cz: number, first: boolean }[]}
 */
export function pointsOf(model, { max = 5000 } = {}) {
  const { levels = [], walls = [], floors = [], doors = [], windows = [], rooms = [] } = model.source
  const pts = []
  const add = (element, kind, id, z0, cen, samples) => {
    samples.forEach(([x, y, z], k) => {
      pts.push({ x, y, z, kind, id, level: levelOf(z0, levels), cx: cen[0], cy: cen[1], cz: cen[2], first: k === 0 })
    })
  }
  for (const w of walls) {
    const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1])
    const n = Math.max(1, Math.ceil(len / STEP))
    const m = Math.max(1, Math.ceil(w.h / STEP))
    const s = []
    for (let j = 0; j <= m; j++)
      for (let i = 0; i <= n; i++) {
        const t = i / n
        s.push([w.a[0] + (w.b[0] - w.a[0]) * t, w.a[1] + (w.b[1] - w.a[1]) * t, w.z + w.h * (j / m)])
      }
    add(w, 'wall', w.id, w.z, [(w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2, w.z + w.h / 2], s)
  }
  for (const f of floors) {
    const xs = f.pts.map((p) => p[0])
    const ys = f.pts.map((p) => p[1])
    const cen = [xs.reduce((a, b) => a + b, 0) / xs.length, ys.reduce((a, b) => a + b, 0) / ys.length, f.z]
    const s = []
    for (let x = Math.min(...xs) + GRID / 2; x < Math.max(...xs); x += GRID)
      for (let y = Math.min(...ys) + GRID / 2; y < Math.max(...ys); y += GRID) if (inside(x, y, f.pts)) s.push([x, y, f.z])
    add(f, 'floor', f.id, f.z, cen, s.length ? s : [[cen[0], cen[1], f.z]])
  }
  const opening = (kind) => (o) => {
    const [x, y, z] = o.p
    const dx = (o.dir[0] * o.w) / 2
    const dy = (o.dir[1] * o.w) / 2
    const cen = [x, y, z + o.h / 2]
    add(o, kind, o.id, z, cen, [cen, [x - dx, y - dy, z], [x + dx, y + dy, z], [x - dx, y - dy, z + o.h], [x + dx, y + dy, z + o.h]])
  }
  doors.forEach(opening('door'))
  windows.forEach(opening('window'))
  for (const r of rooms) add(r, 'room', r.id, r.p[2], [r.p[0], r.p[1], r.p[2] + 0.2], [[r.p[0], r.p[1], r.p[2] + 0.2]])

  if (pts.length <= max) return pts
  const keep = pts.filter((p) => p.first)
  const rest = pts.map((p, i) => [p, i]).filter(([p]) => !p.first)
  const budget = Math.max(max - keep.length, 0)
  const stride = Math.ceil(rest.length / Math.max(budget, 1))
  const picked = rest.filter((_, i) => i % stride === 0).slice(0, budget)
  const firstsAt = new Map(pts.map((p, i) => [p, i]))
  return [...keep.map((p) => [p, firstsAt.get(p)]), ...picked]
    .sort((a, b) => a[1] - b[1])
    .map(([p]) => p)
    .slice(0, max)
}

/** The relations the pipeline really holds: one edge from each door and window to the wall that hosts it. */
export function edgesOf(model) {
  const { walls = [], doors = [], windows = [] } = model.source
  const wallIds = new Set(walls.map((w) => w.id))
  return [...doors, ...windows].filter((o) => o.host != null && wallIds.has(o.host)).map((o) => ({ a: o.id, b: o.host }))
}

/**
 * Where a point should be, and how visible (alpha 0–1), in a phase. `ctx.gap` is the metres between strata.
 * off: gone · motif: assembled, quiet · exploded: each level lifted by its gap · graph: one dot per element, at its
 * centroid, on its level · masked: the graph with the openings dimmed (illustrative) · rebuilt: assembled again.
 */
export function targetOf(pt, phase, ctx) {
  const base = { x: pt.x, y: pt.y, z: pt.z }
  switch (phase) {
    case 'motif':
      return { ...base, a: 0.9 }
    case 'exploded':
      return { x: pt.x, y: pt.y, z: pt.z + pt.level * ctx.gap, a: 1 }
    case 'graph':
    case 'masked': {
      const shown = pt.first ? (phase === 'masked' && isMasked(pt) ? 0.1 : 1) : 0
      return { x: pt.cx, y: pt.cy, z: pt.cz + pt.level * ctx.gap, a: shown }
    }
    case 'rebuilt':
      return { ...base, a: 1 }
    default:
      return { ...base, a: 0 }
  }
}
