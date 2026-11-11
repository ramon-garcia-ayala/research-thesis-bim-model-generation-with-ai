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
  right: { cx: 0.74, cy: 0.5, scale: 0.86 },
  left: { cx: 0.26, cy: 0.5, scale: 0.86 },
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

// ---------------------------------------------------------------------------------------------------------------
// The canvas
// ---------------------------------------------------------------------------------------------------------------

const DUR = 1400 // ms a phase change takes (the portfolio's morphs: 1.15–1.6 s, easeInOutSine)
const STAGGER = 300 // ms of extra start, spread by `delayOf`
const GAP = 6 // metres between strata when exploded
const PITCH = 0.62 // how far the view looks down, radians
const YAW0 = 0.6
const YAW_RATE = 0.04 // radians per second

/** A plan point (x, y; z up) seen from a turntable camera: `x` right, `y` down on the screen, `depth` away from the eye. */
export function project3(p, cam) {
  const cy = Math.cos(cam.yaw)
  const sy = Math.sin(cam.yaw)
  const xr = p.x * cy - p.y * sy
  const yr = p.x * sy + p.y * cy
  const cp = Math.cos(cam.pitch)
  const sp = Math.sin(cam.pitch)
  return { x: xr, y: -(p.z * cp + yr * sp), depth: yr * cp - p.z * sp }
}

const lerp = (a, b, t) => a + (b - a) * t

/**
 * Mounts the building as a canvas at the back of the deck's `.stage`, and follows the slides: each slide's `data-phase`
 * (see PHASES) and `data-place` (see PLACES) say what the building does and where it stands. Phase changes tween;
 * the time only runs while the pitch runs (`body[data-pitch-state]` is `running`, or absent on a deck that is not a pitch).
 * Ready, paused, done, embedded and reduced-motion states show each phase at once, without tweening.
 * Returns null without a stage or a 2D context.
 * @param {Window} win
 * @param {{ source: object }} model  the deck's `model.json`
 * @returns {{ phase(): string, place(): string, visible(): number, destroy(): void } | null}  `visible` counts the points showing
 */
export function mountBuilding(win, model, opts = {}) {
  const doc = win.document
  const stage = doc.querySelector('.stage')
  if (!stage) return null
  const canvas = doc.createElement('canvas')
  canvas.className = 'pitch-building'
  canvas.setAttribute('aria-hidden', 'true')
  const g = canvas.getContext('2d')
  if (!g) return null
  stage.prepend(canvas)

  const pts = pointsOf(model, opts)
  const ctx = { gap: GAP }
  const firstOf = new Map()
  pts.forEach((p, i) => p.first && firstOf.set(p.id, i))
  const edgeAt = edgesOf(model)
    .map((e) => [firstOf.get(e.a), firstOf.get(e.b)])
    .filter(([a, b]) => a != null && b != null)

  // the view is centred on, and sized for, the exploded building: the biggest it gets
  const open = pts.map((p) => targetOf(p, 'exploded', ctx))
  const span = (k) => [Math.min(...open.map((o) => o[k])), Math.max(...open.map((o) => o[k]))]
  const mid = ['x', 'y', 'z'].map((k) => (span(k)[0] + span(k)[1]) / 2)
  const radius = Math.max(1, ...open.map((o) => Math.hypot(o.x - mid[0], o.y - mid[1], o.z - mid[2])))

  const cur = pts.map((p) => targetOf(p, 'off', ctx))
  const from = cur.map((c) => ({ ...c }))
  const goal = cur.map((c) => ({ ...c }))
  let phase = 'off'
  let placeName = 'full'
  let placeFrom = { ...PLACES.full }
  let placeGoal = { ...PLACES.full }
  let placeCur = { ...PLACES.full }
  let edgeFrom = 0
  let edgeGoal = 0
  let edgeCur = 0
  let clock = 0
  let tweenAt = 0
  let dirty = true
  let alive = true
  let last = null
  let timer = 0

  const reduced = () => win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  const state = () => doc.body.dataset.pitchState
  const animating = () => !reduced() && !doc.documentElement.hasAttribute('data-embed') && (state() === 'running' || state() === undefined)

  const token = (name, fallback) => win.getComputedStyle(doc.documentElement).getPropertyValue(name).trim() || fallback
  let colours = { ink: '#1d1d1f', line: '#6e6e73', accent: '#7d3bd8' }
  const readColours = () => {
    colours = { ink: token('--ink', '#1d1d1f'), line: token('--ink-secondary', '#6e6e73'), accent: token('--flow-engine', '#7d3bd8') }
  }
  readColours()

  const settle = () => {
    cur.forEach((c, i) => Object.assign(c, goal[i]))
    placeCur = { ...placeGoal }
    edgeCur = edgeGoal
  }

  const setPhase = (name, place) => {
    phase = PHASES.includes(name) ? name : 'off'
    placeName = place in PLACES ? place : 'full'
    pts.forEach((p, i) => {
      from[i] = { ...cur[i] }
      goal[i] = targetOf(p, phase, ctx)
    })
    placeFrom = { ...placeCur }
    placeGoal = { ...placeOf(placeName) }
    edgeFrom = edgeCur
    edgeGoal = phase === 'graph' || phase === 'masked' ? 1 : 0
    tweenAt = clock
    if (!animating()) settle()
    dirty = true
  }

  const step = () => {
    const t = clock - tweenAt
    pts.forEach((p, i) => {
      const q = ease((t - delayOf(p) * STAGGER) / DUR)
      cur[i].x = lerp(from[i].x, goal[i].x, q)
      cur[i].y = lerp(from[i].y, goal[i].y, q)
      cur[i].z = lerp(from[i].z, goal[i].z, q)
      cur[i].a = lerp(from[i].a, goal[i].a, q)
    })
    const q = ease(t / DUR)
    placeCur = { cx: lerp(placeFrom.cx, placeGoal.cx, q), cy: lerp(placeFrom.cy, placeGoal.cy, q), scale: lerp(placeFrom.scale, placeGoal.scale, q) }
    edgeCur = lerp(edgeFrom, edgeGoal, q)
  }

  const draw = () => {
    const W = stage.clientWidth
    const H = stage.clientHeight
    const dpr = win.devicePixelRatio || 1
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, W, H)
    const k = (H * placeCur.scale * 0.5 * 0.92) / radius
    const cam = { yaw: YAW0 + (clock / 1000) * YAW_RATE, pitch: PITCH }
    const at = (c) => {
      const s = project3({ x: c.x - mid[0], y: c.y - mid[1], z: c.z - mid[2] }, cam)
      return [placeCur.cx * W + s.x * k, placeCur.cy * H + s.y * k]
    }
    if (edgeCur > 0.01) {
      g.strokeStyle = colours.line
      g.lineWidth = 1
      for (const [a, b] of edgeAt) {
        g.globalAlpha = edgeCur * Math.min(cur[a].a, cur[b].a) * 0.35
        if (g.globalAlpha < 0.01) continue
        const [ax, ay] = at(cur[a])
        const [bx, by] = at(cur[b])
        g.beginPath()
        g.moveTo(ax, ay)
        g.lineTo(bx, by)
        g.stroke()
      }
    }
    const d = Math.max(1.2, W * 0.0018)
    const marked = phase === 'masked' || phase === 'rebuilt'
    for (const accent of [false, true]) {
      g.fillStyle = accent ? colours.accent : colours.ink
      pts.forEach((p, i) => {
        if (cur[i].a < 0.01 || (marked && isMasked(p)) !== accent) return
        g.globalAlpha = cur[i].a
        const [x, y] = at(cur[i])
        g.fillRect(x - d / 2, y - d / 2, d, d)
      })
    }
    g.globalAlpha = 1
  }

  const schedule = (fn) => (win.requestAnimationFrame ? win.requestAnimationFrame(fn) : win.setTimeout(() => fn(win.performance?.now?.() ?? Date.now()), 16))
  const cancel = (id) => (win.cancelAnimationFrame ? win.cancelAnimationFrame(id) : win.clearTimeout(id))
  const frame = (now) => {
    if (!alive) return
    timer = schedule(frame)
    const dt = last == null ? 0 : Math.min(now - last, 100)
    last = now
    if (animating()) {
      clock += dt
      step()
    }
    if (animating() || dirty) {
      draw()
      dirty = false
    }
  }

  const follow = (slide) => slide && stage.contains(slide) && setPhase(slide.dataset.phase, slide.dataset.place)
  const onSlide = (e) => follow(e.detail?.slide)
  const refresh = () => {
    readColours()
    dirty = true
  }
  // a pitch that returns to `ready` (a restart) shows every slide complete: a tween cut short must not freeze half-way
  const onState = () => {
    if (state() === 'ready') settle()
    refresh()
  }
  const slides = [...stage.querySelectorAll('section.slide')]
  follow(slides.find((s) => !s.hidden) ?? slides[0])

  doc.addEventListener('deck:slide', onSlide)
  win.addEventListener('resize', refresh)
  const watchers = [
    win.MutationObserver && new win.MutationObserver(refresh),
    win.MutationObserver && new win.MutationObserver(onState),
    win.ResizeObserver && new win.ResizeObserver(refresh),
  ].filter(Boolean)
  watchers[0]?.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-embed'] })
  watchers[1]?.observe(doc.body, { attributes: true, attributeFilter: ['data-pitch-state'] })
  watchers[2]?.observe(stage)
  timer = schedule(frame)

  return {
    phase: () => phase,
    place: () => placeName,
    visible: () => cur.filter((c) => c.a > 0.01).length,
    destroy() {
      alive = false
      cancel(timer)
      doc.removeEventListener('deck:slide', onSlide)
      win.removeEventListener('resize', refresh)
      watchers.forEach((w) => w.disconnect())
      canvas.remove()
    },
  }
}
