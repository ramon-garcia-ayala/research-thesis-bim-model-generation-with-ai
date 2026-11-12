// The building of the pitch (deck 06), drawn on a canvas behind the slides: an axonometric line drawing in the manner
// of the author's portfolio intro (slabs as outlines, walls as ghosted surfaces that fade upward, dashed guides, strata
// labelled with leader lines). It is Autodesk's sample project (the pipeline's `source.rvt`), read from the deck's
// `model.json`. What it shows of the pipeline is real: the levels, the elements on each, the door and window hosts as
// the edges of the graph. What is not built yet (a mask over the openings, the AI placing them back) is drawn in the
// accent colour, and the slide says it is illustrative.
//
// The pure part (geometry, phases, projection, fit) is exported for the tests; `mountBuilding` is the canvas.

/** What a slide asks for with `data-phase`. */
export const PHASES = ['off', 'exploded', 'graph', 'masked', 'rebuilt', 'motif']

/** The box the drawing fits in, as fractions of the stage (`data-place`). */
export const PLACES = {
  right: { x: 0.5, y: 0.12, w: 0.47, h: 0.7 },
  left: { x: 0.03, y: 0.12, w: 0.47, h: 0.7 },
  full: { x: 0.08, y: 0.12, w: 0.84, h: 0.7 },
  corner: { x: 0.85, y: 0.7, w: 0.11, h: 0.15 },
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

/** The relations the pipeline really holds: one edge from each door and window to the wall that hosts it. */
export function edgesOf(model) {
  const { walls = [], doors = [], windows = [] } = model.source
  const wallIds = new Set(walls.map((w) => w.id))
  return [...doors, ...windows].filter((o) => o.host != null && wallIds.has(o.host)).map((o) => ({ a: o.id, b: o.host }))
}

/**
 * The model ready to draw. Its strata are the levels that hold something, bottom up, named without their number
 * prefix ("01 - Entry Level" → "Entry Level") and counted. Every element carries the index of its stratum; each
 * opening carries the index of its host wall (-1 without one). `bounds` is the plan and the height; `center` the plan's.
 */
export function geometryOf(model) {
  const { levels = [], walls = [], floors = [], doors = [], windows = [], rooms = [] } = model.source
  const W = walls.map((w) => ({ id: w.id, a: w.a, b: w.b, z: w.z, h: w.h, curtain: !!w.curtain, at: levelOf(w.z, levels) }))
  const F = floors.map((f) => ({ id: f.id, pts: f.pts, z: f.z, at: levelOf(f.z, levels) }))
  const wallAt = new Map(walls.map((w, i) => [w.id, i]))
  const O = [...doors.map((d) => ({ ...d, kind: 'door' })), ...windows.map((o) => ({ ...o, kind: 'window' }))].map((o) => {
    const host = wallAt.get(o.host) ?? -1
    return { id: o.id, kind: o.kind, p: o.p, w: o.w, h: o.h, dir: o.dir, host, at: host >= 0 ? W[host].at : levelOf(o.p[2], levels) }
  })
  const R = rooms.map((r) => ({ p: r.p, at: levelOf(r.p[2], levels) }))

  // strata: the levels that hold something, renumbered from the bottom
  const used = [...new Set([...W, ...F, ...O].map((e) => e.at))].sort((a, b) => a - b)
  const stratum = new Map(used.map((at, i) => [at, i]))
  const strata = used.map((at) => ({
    name: String(levels[at]?.name ?? '').replace(/^\s*\d+\s*-\s*/, ''),
    z: levels[at]?.z ?? 0,
    walls: W.filter((w) => w.at === at).length,
    openings: O.filter((o) => o.at === at).length,
  }))
  const restrat = (e) => ({ ...e, level: stratum.get(e.at) ?? 0 })

  const xs = [...W.flatMap((w) => [w.a[0], w.b[0]]), ...F.flatMap((f) => f.pts.map((p) => p[0]))]
  const ys = [...W.flatMap((w) => [w.a[1], w.b[1]]), ...F.flatMap((f) => f.pts.map((p) => p[1]))]
  const zs = [...W.flatMap((w) => [w.z, w.z + w.h]), ...F.map((f) => f.z)]
  const bounds = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), z0: Math.min(...zs), z1: Math.max(...zs) }
  return {
    levels: strata,
    walls: W.map(restrat),
    floors: F.map(restrat),
    openings: O.map(restrat),
    rooms: R.filter((r) => stratum.has(r.at)).map(restrat),
    bounds,
    center: [(bounds.x0 + bounds.x1) / 2, (bounds.y0 + bounds.y1) / 2],
  }
}

/**
 * How the drawing looks in a phase, as numbers that tween: alpha (all of it), explode (the strata apart), labels (their
 * names), graph (elements become nodes and host edges), mask (the openings hidden, in the accent), ember (the openings
 * placed back, in the accent).
 */
export function phaseVector(phase) {
  const base = { alpha: 0, explode: 0, labels: 0, graph: 0, mask: 0, ember: 0 }
  switch (phase) {
    case 'exploded':
      return { ...base, alpha: 1, explode: 1, labels: 1 }
    case 'graph':
      return { ...base, alpha: 1, explode: 0.55, graph: 1 }
    case 'masked':
      return { ...base, alpha: 1, explode: 0.55, graph: 1, mask: 1 }
    case 'rebuilt':
      return { ...base, alpha: 1, ember: 1 }
    case 'motif':
      return { ...base, alpha: 0.75 }
    default:
      return base
  }
}

/** Each number of `a` moved towards `b` by `t`. */
export function mix(a, b, t) {
  return Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] - a[k]) * t]))
}

/** The portfolio's axonometric: plan turned by `yaw`, its depth squashed by `tilt`, z straight up the screen. */
export function iso(p, cam) {
  const c = Math.cos(cam.yaw)
  const s = Math.sin(cam.yaw)
  const u = p.x * c - p.y * s
  const v = p.x * s + p.y * c
  return { x: (u - v) * 0.866, y: (u + v) * 0.5 * cam.tilt - p.z }
}

/**
 * Scale `k` and origin (`ox`, `oy`) in pixels that fit the building, opened by `explode` strata of `gap` metres, into
 * its place on a W × H stage, leaving the share `labels` of the place's width free on the right for the strata names.
 * It holds for the camera's yaw ± `cam.sway`, so a slow sway never leaves the box.
 */
export function fitOf(g, place, W, H, cam, { gap, explode, labels }) {
  const { x0, x1, y0, y1, z0, z1 } = g.bounds
  const [cx, cy] = g.center
  const top = z1 + (g.levels.length - 1) * gap * explode
  let a = Infinity
  let b = Infinity
  let c = -Infinity
  let d = -Infinity
  for (const yaw of [cam.yaw - (cam.sway ?? 0), cam.yaw, cam.yaw + (cam.sway ?? 0)])
    for (const x of [x0, x1])
      for (const y of [y0, y1])
        for (const z of [z0, top]) {
          const p = iso({ x: x - cx, y: y - cy, z }, { yaw, tilt: cam.tilt })
          a = Math.min(a, p.x)
          b = Math.min(b, p.y)
          c = Math.max(c, p.x)
          d = Math.max(d, p.y)
        }
  const bw = place.w * W * (1 - labels)
  const bh = place.h * H
  const k = Math.min(bw / (c - a || 1), bh / (d - b || 1))
  return { k, ox: place.x * W + (bw - (c - a) * k) / 2 - a * k, oy: place.y * H + (bh - (d - b) * k) / 2 - b * k }
}

/** A CSS colour (#rgb, #rrggbb, rgb(), rgba()) as [r, g, b]; `fallback` when it cannot be read. */
export function rgbOf(css, fallback = [128, 128, 128]) {
  const s = String(css ?? '').trim()
  let m = /^#([0-9a-f]{6})$/i.exec(s)
  if (m) return [0, 2, 4].map((i) => Number.parseInt(m[1].slice(i, i + 2), 16))
  m = /^#([0-9a-f]{3})$/i.exec(s)
  if (m) return [...m[1]].map((h) => Number.parseInt(h + h, 16))
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s)
  if (m) return [1, 2, 3].map((i) => Math.round(Number(m[i])))
  return fallback
}

// ---------------------------------------------------------------------------------------------------------------
// The canvas
// ---------------------------------------------------------------------------------------------------------------

const DUR = 1500 // ms a phase change takes (the portfolio's morphs: 1.15–1.6 s, easeInOutSine)
const YAW = 0.5
const SWAY = 0.07 // radians the view sways while the pitch runs
const TILT = 0.5
const LABELS = 0.3 // share of a place kept for the strata names while they show

/**
 * Mounts the building as a canvas at the back of the deck's `.stage`, and follows the slides: each slide's
 * `data-phase` (see PHASES) and `data-place` (see PLACES) say what the building does and where it stands. Changes tween;
 * the time only runs while the pitch runs (`body[data-pitch-state]` is `running`, or absent on a deck that is not a
 * pitch). Ready, paused, done, embedded and reduced-motion states show each phase at once. Colours come from the
 * pitch's tokens (`--p-ink`, `--p-ember`), so both themes work. Returns null without a stage or a 2D context.
 * @returns {{ phase(): string, place(): string, visible(): number, destroy(): void } | null}  `visible` is the alpha
 */
export function mountBuilding(win, model) {
  const doc = win.document
  const stage = doc.querySelector('.stage')
  if (!stage) return null
  const canvas = doc.createElement('canvas')
  canvas.className = 'pitch-building'
  canvas.setAttribute('aria-hidden', 'true')
  const g = canvas.getContext('2d')
  if (!g) return null
  stage.prepend(canvas)

  const geo = geometryOf(model)
  // strata apart by a share of the plan, so a wide, low building still opens into readable layers
  const span = Math.max(geo.bounds.x1 - geo.bounds.x0, geo.bounds.y1 - geo.bounds.y0)
  const gap = Math.max(3, span * 0.15)

  let phase = 'off'
  let placeName = 'full'
  let from = phaseVector('off')
  let goal = phaseVector('off')
  let cur = { ...goal }
  let placeFrom = { ...PLACES.full }
  let placeGoal = { ...PLACES.full }
  let placeCur = { ...PLACES.full }
  let clock = 0
  let tweenAt = 0
  let dirty = true
  let alive = true
  let last = null
  let timer = 0

  const reduced = () => win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  const state = () => doc.body.dataset.pitchState
  const animating = () => !reduced() && !doc.documentElement.hasAttribute('data-embed') && (state() === 'running' || state() === undefined)

  let ink = [238, 237, 233]
  let ember = [240, 96, 58]
  const readColours = () => {
    const css = win.getComputedStyle(doc.body)
    ink = rgbOf(css.getPropertyValue('--p-ink') || css.getPropertyValue('--ink'), [128, 128, 128])
    ember = rgbOf(css.getPropertyValue('--p-ember'), [240, 96, 58])
  }
  readColours()
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`

  const settle = () => {
    cur = { ...goal }
    placeCur = { ...placeGoal }
  }
  const setPhase = (name, place) => {
    phase = PHASES.includes(name) ? name : 'off'
    placeName = place in PLACES ? place : 'full'
    from = { ...cur }
    goal = phaseVector(phase)
    placeFrom = { ...placeCur }
    placeGoal = { ...placeOf(placeName) }
    tweenAt = clock
    if (!animating()) settle()
    dirty = true
  }
  const step = () => {
    const q = ease((clock - tweenAt) / DUR)
    cur = mix(from, goal, q)
    placeCur = mix(placeFrom, placeGoal, q)
  }

  const draw = () => {
    const W = stage.clientWidth
    const H = stage.clientHeight
    const dpr = Math.min(win.devicePixelRatio || 1, 2)
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, W, H)
    const V = cur
    const A = V.alpha
    if (A < 0.005 || !W || !H) return
    const s = W / 1200 // type and marks scale with the stage
    const cam = { yaw: YAW + SWAY * Math.sin(clock / 7000), tilt: TILT, sway: SWAY }
    const fit = fitOf(geo, placeCur, W, H, { yaw: YAW, tilt: TILT, sway: SWAY }, { gap, explode: V.explode, labels: LABELS * V.labels })
    const [cx, cy] = geo.center
    const lift = gap * V.explode
    const P = (x, y, z, level) => {
      const p = iso({ x: x - cx, y: y - cy, z: z + level * lift }, cam)
      return [fit.ox + p.x * fit.k, fit.oy + p.y * fit.k]
    }
    const ring = (pts, z, level) => {
      pts.forEach(([x, y], i) => {
        const [sx, sy] = P(x, y, z, level)
        if (i) g.lineTo(sx, sy)
        else g.moveTo(sx, sy)
      })
      g.closePath()
    }
    const seg = (x1, y1, z1, x2, y2, z2, level) => {
      const [ax, ay] = P(x1, y1, z1, level)
      const [bx, by] = P(x2, y2, z2, level)
      g.moveTo(ax, ay)
      g.lineTo(bx, by)
    }
    g.lineWidth = 1
    g.lineCap = 'round'
    const model = 1 - V.graph * 0.75 // the drawing steps back while the graph shows

    // dashed guides through the whole stack, while the strata are apart
    if (V.explode > 0.02) {
      g.setLineDash([2, 6])
      g.strokeStyle = rgba(ink, 0.16 * A * V.explode)
      g.beginPath()
      const { x0, x1, y0, y1, z0, z1 } = geo.bounds
      for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) seg(x, y, z0 - 0.5, x, y, z1 + 1, 0)
      g.stroke()
      g.setLineDash([])
    }

    // slabs: a double outline, the slab's thickness
    g.strokeStyle = rgba(ink, 0.7 * A * model)
    g.beginPath()
    for (const f of geo.floors) {
      ring(f.pts, f.z, f.level)
      ring(f.pts, f.z - 0.3, f.level)
    }
    g.stroke()

    // walls: ghosted surfaces fading upward, a footprint line, a faint top edge
    const ghostA = 0.13 * A * model
    if (ghostA > 0.004)
      for (const w of geo.walls) {
        const [ax, ay] = P(w.a[0], w.a[1], w.z, w.level)
        const [bx, by] = P(w.b[0], w.b[1], w.z, w.level)
        const [tx, ty] = P(w.b[0], w.b[1], w.z + w.h, w.level)
        const [ux, uy] = P(w.a[0], w.a[1], w.z + w.h, w.level)
        const gr = g.createLinearGradient((ax + bx) / 2, (ay + by) / 2, (tx + ux) / 2, (ty + uy) / 2)
        gr.addColorStop(0, rgba(ink, ghostA * (w.curtain ? 0.6 : 1)))
        gr.addColorStop(1, rgba(ink, 0))
        g.fillStyle = gr
        g.beginPath()
        g.moveTo(ax, ay)
        g.lineTo(bx, by)
        g.lineTo(tx, ty)
        g.lineTo(ux, uy)
        g.closePath()
        g.fill()
      }
    g.strokeStyle = rgba(ink, 0.55 * A * model)
    g.beginPath()
    for (const w of geo.walls) seg(w.a[0], w.a[1], w.z, w.b[0], w.b[1], w.z, w.level)
    g.stroke()
    g.strokeStyle = rgba(ink, 0.16 * A * model)
    g.beginPath()
    for (const w of geo.walls) seg(w.a[0], w.a[1], w.z + w.h, w.b[0], w.b[1], w.z + w.h, w.level)
    g.stroke()

    // openings: their frame in the wall's plane; ink while real, the accent while hidden or placed back by the AI
    const frame = (o) => {
      const dx = (o.dir[0] * o.w) / 2
      const dy = (o.dir[1] * o.w) / 2
      ring([[o.p[0] - dx, o.p[1] - dy], [o.p[0] + dx, o.p[1] + dy]], o.p[2], o.level) // the sill
      seg(o.p[0] - dx, o.p[1] - dy, o.p[2], o.p[0] - dx, o.p[1] - dy, o.p[2] + o.h, o.level)
      seg(o.p[0] + dx, o.p[1] + dy, o.p[2], o.p[0] + dx, o.p[1] + dy, o.p[2] + o.h, o.level)
      seg(o.p[0] - dx, o.p[1] - dy, o.p[2] + o.h, o.p[0] + dx, o.p[1] + dy, o.p[2] + o.h, o.level)
    }
    const shown = A * (1 - V.mask) * model
    if (shown * (1 - V.ember) > 0.004) {
      g.strokeStyle = rgba(ink, 0.7 * shown * (1 - V.ember))
      g.beginPath()
      geo.openings.forEach(frame)
      g.stroke()
    }
    if (shown * V.ember > 0.004) {
      g.strokeStyle = rgba(ember, 0.95 * shown * V.ember)
      g.lineWidth = 1.4
      g.beginPath()
      geo.openings.forEach(frame)
      g.stroke()
      g.lineWidth = 1
    }

    // rooms: a dot each, the data the slabs carry
    g.fillStyle = rgba(ink, 0.4 * A * model)
    const d = Math.max(1.2, 1.6 * s)
    for (const r of geo.rooms) {
      const [x, y] = P(r.p[0], r.p[1], r.p[2] + 0.05, r.level)
      g.fillRect(x - d / 2, y - d / 2, d, d)
    }

    // the graph: a node per wall and per opening, an edge from each opening to its host wall
    const G = A * V.graph
    if (G > 0.004) {
      const mid = (w) => P((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2, w.z + w.h / 2, w.level)
      const node = (o) => P(o.p[0], o.p[1], o.p[2] + o.h / 2, o.level)
      const hosted = geo.openings.filter((o) => o.host >= 0)
      g.strokeStyle = rgba(ink, 0.32 * G * (1 - V.mask))
      g.beginPath()
      for (const o of hosted) {
        const [ax, ay] = node(o)
        const [bx, by] = mid(geo.walls[o.host])
        g.moveTo(ax, ay)
        g.lineTo(bx, by)
      }
      g.stroke()
      if (V.mask > 0.01) {
        g.setLineDash([2, 3])
        g.strokeStyle = rgba(ember, 0.6 * G * V.mask)
        g.beginPath()
        for (const o of hosted) {
          const [ax, ay] = node(o)
          const [bx, by] = mid(geo.walls[o.host])
          g.moveTo(ax, ay)
          g.lineTo(bx, by)
        }
        g.stroke()
        g.setLineDash([])
      }
      g.fillStyle = rgba(ink, 0.85 * G)
      const r = Math.max(1.3, 1.7 * s)
      for (const w of geo.walls) {
        const [x, y] = mid(w)
        g.beginPath()
        g.arc(x, y, r, 0, Math.PI * 2)
        g.fill()
      }
      g.fillStyle = rgba(ink, 0.95 * G * (1 - V.mask))
      for (const o of geo.openings) {
        const [x, y] = node(o)
        g.beginPath()
        g.arc(x, y, r * 1.35, 0, Math.PI * 2)
        g.fill()
      }
      if (V.mask > 0.01) {
        g.strokeStyle = rgba(ember, 0.95 * G * V.mask)
        g.setLineDash([2, 2])
        for (const o of geo.openings) {
          const [x, y] = node(o)
          g.beginPath()
          g.arc(x, y, r * 2.6, 0, Math.PI * 2)
          g.stroke()
        }
        g.setLineDash([])
      }
    }

    // the strata's names, on the right, with leader lines (the portfolio's hero list)
    const L = A * V.labels
    if (L > 0.01 && geo.levels.length) {
      const lx = (placeCur.x + placeCur.w * (1 - LABELS)) * W + 18 * s
      const anchors = geo.levels.map((lv, i) => {
        let best = null
        for (const f of geo.floors.filter((f) => f.level === i))
          for (const [x, y] of f.pts) {
            const p = P(x, y, f.z, i)
            if (!best || p[0] > best[0]) best = p
          }
        if (!best) {
          const w = geo.walls.find((w) => w.level === i)
          best = w ? P(w.b[0], w.b[1], w.z, i) : [lx, 0]
        }
        return best
      })
      const order = anchors.map((_, i) => i).sort((i, j) => anchors[j][1] - anchors[i][1])
      const ys = []
      let limit = Infinity
      for (const i of order) {
        ys[i] = Math.min(anchors[i][1], limit - 34 * s)
        limit = ys[i]
      }
      g.textBaseline = 'middle'
      geo.levels.forEach((lv, i) => {
        const [ax, ay] = anchors[i]
        const y = ys[i]
        g.strokeStyle = rgba(ink, 0.22 * L)
        g.beginPath()
        g.moveTo(ax, ay)
        g.lineTo(lx - 10 * s, y)
        g.stroke()
        g.fillStyle = rgba(ink, 0.6 * L)
        g.beginPath()
        g.arc(ax, ay, 1.8 * s, 0, Math.PI * 2)
        g.arc(lx - 10 * s, y, 1.6 * s, 0, Math.PI * 2)
        g.fill()
        g.font = `500 ${(11 * s).toFixed(1)}px "Geist Mono", ui-monospace, monospace`
        g.fillStyle = rgba(ink, 0.82 * L)
        g.fillText(`${String(i + 1).padStart(2, '0')}  ${lv.name.toUpperCase()}`, lx, y - 7 * s)
        g.font = `400 ${(10 * s).toFixed(1)}px "Geist Mono", ui-monospace, monospace`
        g.fillStyle = rgba(ink, 0.42 * L)
        g.fillText(`${lv.walls} walls · ${lv.openings} openings`, lx, y + 8 * s)
      })
    }
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
  follow(slides.find((sl) => !sl.hidden) ?? slides[0])

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
  // the labels' font may arrive after the first frame
  doc.fonts?.ready?.then?.(() => (dirty = true))
  timer = schedule(frame)

  return {
    phase: () => phase,
    place: () => placeName,
    visible: () => cur.alpha,
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
