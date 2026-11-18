/*
 * The experiments' 3D views (deck 07, E1–E3): `<div class="model3d" data-mode="set" data-set="e1|e2|e3_truth|e3_transformer"
 * data-side="<key of models>" data-frame="piece|building">`. Reads views.json, copied by `scripts/deck-model.mjs --views`
 * from pipeline/out/experiments/deck-views.json. Each view colours its model by the step its slide is at (deck.js
 * data-step; complete = the last step), with one meaning per colour on every slide:
 *   --diff-1 blue: what the AI proposes, and the seed of a piece · --diff-3 green: right · --diff-4 amber: partly right ·
 *   --diff-2 orange: wrong · dashed --ink-tertiary: missing.
 * Views with the same frame share one camera, so moving between their slides keeps the view still.
 */
import * as THREE from 'three'
import { OrbitControls } from './vendor/three/OrbitControls.js'
import { FOV, HALF_WIDTH, WIDE_ASPECT, at, floorMesh, openingMesh, token, wallMesh } from './model3d.js'

const ROOM_R = 1.2
/** Lines between openings float this far above the sill, so they read above the slab. */
const LIFT = 1
/** Milliseconds between two elements (E1's ring by ring) or two storeys (E3's openings) as they come in. */
const STAGGER = { node: 70, storey: 380 }

/** "M_Single-Flush | 0915 x 2134mm" → [0.915, 2.134]; a door's size when the type has none. */
function sizeOf(type) {
  const m = /(\d+)\s*x\s*(\d+)\s*mm/i.exec(type ?? '')
  return m ? [Number(m[1]) / 1000, Number(m[2]) / 1000] : [0.9, 2.1]
}

/** The last step of a view's slide: its highest data-build (0 when it has none). */
function totalOf(host) {
  const slide = host.closest('.slide')
  const steps = [...(slide?.querySelectorAll('[data-build]') ?? [])].map((e) => Number(e.dataset.build) || 0)
  return Math.max(0, ...steps)
}

/**
 * The step a view shows: its slide's data-step while it is being built, the last one when it is complete or not shown.
 */
export function stepOf(host, total) {
  const slide = host.closest('.slide')
  if (!slide || slide.dataset.complete !== undefined || slide.dataset.step === undefined) return total
  const n = Number(slide.dataset.step)
  return Number.isFinite(n) ? Math.min(n, total) : total
}

/** Every element of a model by id, with its kind and the point its relations are drawn from. */
function indexOf(model) {
  const idx = new Map()
  for (const w of model.walls) idx.set(w.id, { kind: 'wall', el: w, centre: at((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2, w.z + w.h / 2) })
  for (const f of model.floors) {
    const cx = f.pts.reduce((s, p) => s + p[0], 0) / f.pts.length
    const cy = f.pts.reduce((s, p) => s + p[1], 0) / f.pts.length
    idx.set(f.id, { kind: 'floor', el: f, centre: at(cx, cy, f.z) })
  }
  for (const o of [...model.doors, ...model.windows]) idx.set(o.id, { kind: 'opening', el: o, centre: at(o.p[0], o.p[1], o.p[2] + o.h / 2) })
  for (const r of model.rooms) idx.set(r.id, { kind: 'room', el: r, centre: at(r.p[0], r.p[1], r.p[2] + 0.15) })
  return idx
}

/** The unit direction of a wall in plan, for an opening placed on it. */
function dirOfWall(w) {
  if (!w) return [1, 0]
  const dx = w.b[0] - w.a[0]
  const dy = w.b[1] - w.a[1]
  const len = Math.hypot(dx, dy) || 1
  return [dx / len, dy / len]
}

/** Materials, made once per theme and shared by every element with the same look. */
function paletteOf() {
  const c = (name) => new THREE.Color(token(name))
  const hues = { ink: c('--ink'), quiet: c('--ink-tertiary'), blue: c('--diff-1'), orange: c('--diff-2'), green: c('--diff-3'), amber: c('--diff-4') }
  const cache = new Map()
  const once = (key, make) => cache.get(key) ?? cache.set(key, make()).get(key)
  const surface = (hue, opacity) =>
    once(`s:${hue}:${opacity}`, () => new THREE.MeshLambertMaterial({ color: hues[hue], transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }))
  const line = (hue, opacity, dashed = false) =>
    once(`l:${hue}:${opacity}:${dashed}`, () =>
      dashed
        ? new THREE.LineDashedMaterial({ color: hues[hue], transparent: true, opacity, dashSize: 0.35, gapSize: 0.25 })
        : new THREE.LineBasicMaterial({ color: hues[hue], transparent: opacity < 1, opacity }),
    )
  return { hues, surface, line, panel: c('--panel'), dispose: () => cache.forEach((m) => m.dispose()) }
}

/**
 * The looks an element can take. `faint`: context far back · `context`: the building as in deck 04's plain views ·
 * `solid`: what is being told · `ghost`: where something really was · a hue: lit in that colour.
 */
function setLook(d, look, pal) {
  const shown = look !== 'hidden'
  d.mesh.visible = shown
  d.edges.visible = shown
  if (!shown) return
  const floor = d.kind === 'floor'
  const opening = d.kind === 'opening'
  let surface
  let edge
  if (look === 'faint') {
    surface = pal.surface('quiet', 0.02)
    edge = pal.line('ink', 0.035)
  } else if (look === 'context') {
    surface = pal.surface(opening ? 'ink' : 'quiet', floor ? 0.3 : opening ? 0.5 : 0.16)
    edge = pal.line('ink', opening ? 0.6 : 0.3)
  } else if (look === 'solid') {
    surface = pal.surface('ink', floor ? 0.12 : opening ? 0.85 : 0.2)
    edge = pal.line('ink', 0.9)
  } else if (look === 'ghost') {
    surface = pal.surface('ink', 0.1)
    edge = pal.line('ink', 0.55, true)
  } else {
    surface = pal.surface(look, floor ? 0.4 : 1)
    edge = pal.line(look, 1)
  }
  d.mesh.material = surface
  d.edges.material = edge
  d.mesh.renderOrder = look === 'faint' || look === 'context' ? 1 : 2
  d.edges.renderOrder = d.mesh.renderOrder
}

/** A drawable: a mesh and its edges, both in the scene. */
function drawable(scene, kind, mesh) {
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30))
  edges.position.copy(mesh.position)
  edges.rotation.copy(mesh.rotation)
  edges.computeLineDistances() // a ghost draws its edges dashed
  scene.add(mesh, edges)
  return { kind, mesh, edges }
}

/** Walls, floors and openings of a model (and the rooms whose ids are given), each a drawable by id. */
function buildBase(model, roomIds = new Set()) {
  const scene = new THREE.Scene()
  const items = new Map()
  model.floors.forEach((f) => items.set(f.id, drawable(scene, 'floor', floorMesh(f))))
  model.walls.forEach((w) => items.set(w.id, drawable(scene, 'wall', wallMesh(w))))
  for (const o of [...model.doors, ...model.windows]) items.set(o.id, drawable(scene, 'opening', openingMesh(o)))
  for (const r of model.rooms)
    if (roomIds.has(r.id)) {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(ROOM_R, ROOM_R, 0.12, 32))
      disc.position.copy(at(r.p[0], r.p[1], r.p[2] + 0.15))
      items.set(r.id, drawable(scene, 'room', disc))
    }
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2))
  const sun = new THREE.DirectionalLight(0xffffff, 1.6)
  sun.position.set(-40, 80, 60)
  scene.add(sun)
  return { scene, items }
}

/** A straight line between two points; dashed lines need their distances for the dash pattern. */
function lineBetween(scene, a, b) {
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]))
  line.computeLineDistances()
  line.visible = false
  scene.add(line)
  return line
}

/** An outline box drawn dashed: an element that should be there and is not. */
function dashedBox(scene, p, w, h, dir) {
  const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, 0.4)))
  box.position.copy(at(p[0], p[1], p[2] + h / 2))
  box.rotation.y = Math.atan2(dir[1], dir[0])
  box.computeLineDistances()
  box.visible = false
  scene.add(box)
  return box
}

/** An HTML element pinned to a point of the view, shown on the steps `show` accepts. */
function overlay(doc, host, className, content, point, show) {
  const el = doc.createElement('span')
  el.className = className
  if (typeof content === 'string') el.textContent = content
  else content.forEach((c) => el.append(c))
  el.hidden = true
  host.append(el)
  return { el, at: point, show }
}

/** Text in both languages, as the deck writes it: <span lang="en">…</span><span lang="es">…</span>. */
function both(doc, en, es, tag = 'span') {
  const out = doc.createElement(tag)
  for (const [lang, text] of [['en', en], ['es', es]]) {
    const s = doc.createElement('span')
    s.lang = lang
    s.textContent = text
    out.append(s)
  }
  return out
}

// ---- The four sets -------------------------------------------------------------------------------------------

/** E1: the seed door and its tokens (1), its wall and the piece's relations (2), the 20 nodes ring by ring (3). */
function setE1(data, model, doc, host) {
  const S = data.e1
  const { scene, items } = buildBase(model, new Set(S.nodes))
  const idx = indexOf(model)
  const lines = S.edges
    .map((e) => {
      const a = idx.get(e.a)?.centre
      const b = idx.get(e.b)?.centre
      return a && b ? { from: e.kind === 'hosted_by' ? 'revit' : 'geometry', line: lineBetween(scene, a, b) } : null
    })
    .filter(Boolean)
  const seed = idx.get(S.seed)
  const chips = (S.tokens[S.seed] ?? []).map((t) => {
    const s = doc.createElement('span')
    s.textContent = t
    return s
  })
  // the tokens run along the bottom of the view, ruled in the seed's blue: pinned to the door they would hide the piece
  const overlays = [overlay(doc, host, 'model3d__chips model3d__chips--bar', chips, null, (s) => s >= 1)]
  function update(step, t, pal) {
    let moving = false
    for (const d of items.values()) setLook(d, d.kind === 'room' ? 'hidden' : 'faint', pal)
    lines.forEach((l) => {
      l.line.visible = step >= 2
      l.line.material = l.from === 'revit' ? pal.line('ink', 0.95) : pal.line('ink', 0.6, true)
    })
    if (step >= 2 && items.has(S.nodes[1])) setLook(items.get(S.nodes[1]), 'solid', pal)
    if (step >= 3)
      S.nodes.forEach((id, i) => {
        const d = items.get(id)
        if (!d) return
        if (t >= i * STAGGER.node) setLook(d, 'solid', pal)
        else moving = true
      })
    if (step >= 1 && items.has(S.seed)) setLook(items.get(S.seed), 'blue', pal)
    return moving
  }
  return { scene, overlays, update }
}

/** E2: the door hidden (1), the AI's door and wall in blue (2), the real one as a ghost and the gap (3). */
function setE2(data, model, doc, host) {
  const S = data.e2
  const piece = new Set(S.piece)
  const { scene, items } = buildBase(model, piece)
  const idx = indexOf(model)
  const [w, h] = sizeOf(S.true.type)
  const [pw, ph] = sizeOf(S.pred.type)
  const pred = drawable(scene, 'opening', openingMesh({ p: S.pred.p, w: pw, h: ph, dir: dirOfWall(idx.get(S.pred.host)?.el) }))
  const ghost = drawable(scene, 'opening', openingMesh({ p: S.true.p, w, h, dir: dirOfWall(idx.get(S.true.host)?.el) }))
  const a = at(S.true.p[0], S.true.p[1], S.true.p[2] + h + 0.4)
  const b = at(S.pred.p[0], S.pred.p[1], S.pred.p[2] + ph + 0.4)
  const gap = lineBetween(scene, a, b)
  // the "?" stands over the piece, on the hidden door's storey, not at its place: that would give the answer away
  const box = new THREE.Box3()
  for (const id of piece) if (idx.get(id)) box.expandByPoint(idx.get(id).centre)
  const mid = box.getCenter(new THREE.Vector3())
  mid.y = S.true.p[2] + 2.6
  const ok = (v) => (v ? '✓' : '✕')
  const chips = [
    both(doc, `door ${ok(S.class_ok)}`, `puerta ${ok(S.class_ok)}`),
    (() => { const s = doc.createElement('span'); s.textContent = `${S.pred.type.replace(' | ', ' ')} ${ok(S.type_ok)}`; return s })(),
    both(doc, `wall ${ok(S.host_ok)} (${Math.round(S.pred.host_prob * 100)}%)`, `muro ${ok(S.host_ok)} (${Math.round(S.pred.host_prob * 100)}%)`),
  ]
  const overlays = [
    overlay(doc, host, 'model3d__badge', '?', mid, (s) => s === 1),
    overlay(doc, host, 'model3d__chips model3d__chips--bar', chips, null, (s) => s >= 2),
    overlay(doc, host, 'model3d__callout model3d__callout--ink', `${S.distance_m.toFixed(2)} m`, a.clone().add(b).multiplyScalar(0.5), (s) => s >= 3),
  ]
  function update(step, t, pal) {
    for (const [id, d] of items) setLook(d, piece.has(id) ? 'solid' : d.kind === 'room' ? 'hidden' : 'faint', pal)
    if (items.has(S.hidden)) setLook(items.get(S.hidden), step >= 1 ? 'hidden' : 'solid', pal)
    if (step >= 2 && items.has(S.pred.host)) setLook(items.get(S.pred.host), 'blue', pal)
    setLook(pred, step >= 2 ? 'blue' : 'hidden', pal)
    setLook(ghost, step >= 3 ? 'ghost' : 'hidden', pal)
    gap.visible = step >= 3
    gap.material = pal.line('ink', 0.9, true)
    return false
  }
  return { scene, overlays, update }
}

/** E3 · real: the model without openings (1), the openings coming in green storey by storey (2), all of them (3). */
function setE3Truth(data, model) {
  const S = data.e3_truth
  const { scene, items } = buildBase(model)
  const storeys = [...new Set([...model.doors, ...model.windows].map((o) => Math.round(o.p[2] / 3.8)))].sort((x, y) => x - y)
  const storeyOf = new Map([...model.doors, ...model.windows].map((o) => [o.id, storeys.indexOf(Math.round(o.p[2] / 3.8))]))
  function update(step, t, pal) {
    let moving = false
    for (const [id, d] of items) {
      if (d.kind !== 'opening') {
        setLook(d, 'context', pal)
        continue
      }
      if (step <= 1) setLook(d, 'hidden', pal)
      else if (step === 2 && t < storeyOf.get(id) * STAGGER.storey) {
        setLook(d, 'hidden', pal)
        moving = true
      } else setLook(d, S.slots[id] === 1 ? 'green' : 'context', pal)
    }
    return moving
  }
  return { scene, overlays: [], update }
}

/** E3 · AI: one legend slot lit per step (1–4: green, amber, orange, dashed missing), then the gaps to the real points (5). */
function setE3Transformer(data, model) {
  const S = data.e3_transformer
  const { scene, items } = buildBase(model)
  const hueOf = { 1: 'green', 2: 'amber', 3: 'orange' }
  const missing = S.missing.map((m) => dashedBox(scene, m.p, 0.9, 2.1, [1, 0]))
  const links = S.links.map((l) => ({
    slot: l.slot,
    line: lineBetween(scene, at(l.true_p[0], l.true_p[1], l.true_p[2] + LIFT), at(l.placed_p[0], l.placed_p[1], l.placed_p[2] + LIFT)),
    dot: (() => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8))
      dot.position.copy(at(l.true_p[0], l.true_p[1], l.true_p[2] + LIFT))
      dot.visible = false
      scene.add(dot)
      return dot
    })(),
  }))
  function update(step, t, pal, total) {
    const all = step >= total
    for (const [id, d] of items) {
      if (d.kind !== 'opening') {
        setLook(d, 'context', pal)
        continue
      }
      const slot = S.slots[id]
      if (step === 0) setLook(d, 'solid', pal)
      else if (hueOf[slot] && (all || step === slot)) setLook(d, hueOf[slot], pal)
      else setLook(d, 'faint', pal)
    }
    missing.forEach((m) => {
      m.visible = all || step === 4
      m.material = pal.line('quiet', 1, true)
    })
    links.forEach((l) => {
      l.line.visible = l.dot.visible = all
      l.line.material = pal.line(hueOf[l.slot] ?? 'ink', 0.9)
      l.dot.material = pal.surface('ink', 0.5)
    })
    return false
  }
  return { scene, overlays: [], update }
}

const SETS = { e1: setE1, e2: setE2, e3_truth: setE3Truth, e3_transformer: setE3Transformer }

// ---- Cameras ---------------------------------------------------------------------------------------------------

/** A camera looking at `bounds` from the deck's oblique angle, the box centred on screen (as model3d.js frames). */
function frameCamera(bounds, tighten) {
  const centre = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3()).length()
  const camera = new THREE.PerspectiveCamera(FOV, WIDE_ASPECT, 0.2, size * 20)
  const fit = (size / 2 / Math.sin(THREE.MathUtils.degToRad(FOV / 2))) * tighten
  camera.position.copy(centre).add(new THREE.Vector3(-0.55, 0.55, 0.7).normalize().multiplyScalar(fit))
  const target = centre.clone()
  camera.lookAt(target)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
  const ndc = []
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) ndc.push(new THREE.Vector3(x, y, z).project(camera))
  const mid = (k) => (Math.min(...ndc.map((p) => p[k])) + Math.max(...ndc.map((p) => p[k]))) / 2
  const reach = camera.position.distanceTo(target) * Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(mid('x') * reach * WIDE_ASPECT)
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(mid('y') * reach)
  const pan = right.add(up)
  camera.position.add(pan)
  target.add(pan)
  return { camera, target }
}

function buildingBounds(model) {
  const box = new THREE.Box3()
  model.walls.forEach((w) => {
    box.expandByPoint(at(w.a[0], w.a[1], w.z))
    box.expandByPoint(at(w.b[0], w.b[1], w.z + w.h))
  })
  return box
}

/**
 * E1's piece: the centres of its 20 elements, with a margin. Centres, not wall ends: the piece holds exterior walls
 * that run the length of the building, and their ends would frame the whole of it.
 */
function pieceBounds(model, nodes) {
  const idx = indexOf(model)
  const box = new THREE.Box3()
  for (const id of nodes) if (idx.get(id)) box.expandByPoint(idx.get(id).centre)
  return box.expandByScalar(3)
}

// ---- E1's piece as a graph -------------------------------------------------------------------------------------

const SVG = 'http://www.w3.org/2000/svg'
/** A class's letter in each language, drawn inside its node. */
const LETTER = { wall: ['W', 'M'], floor: ['F', 'L'], door: ['D', 'P'], window: ['N', 'V'], room: ['R', 'R'] }

/**
 * Lays E1's piece out as a radial tree: the seed in the middle, each BFS ring on its own circle, every node's angle
 * the share of the leaves under it in the BFS tree. All 48 relations are drawn, tree or not.
 */
export function pieceLayout(nodes, edges, seed) {
  const inside = new Set(nodes)
  const adj = new Map(nodes.map((n) => [n, []]))
  for (const e of edges) if (inside.has(e.a) && inside.has(e.b)) adj.get(e.a).push(e.b), adj.get(e.b).push(e.a)
  const depth = new Map([[seed, 0]])
  const children = new Map(nodes.map((n) => [n, []]))
  const queue = [seed]
  while (queue.length) {
    const n = queue.shift()
    for (const m of adj.get(n)) if (!depth.has(m)) depth.set(m, depth.get(n) + 1), children.get(n).push(m), queue.push(m)
  }
  const leaves = (n) => (children.get(n).length ? children.get(n).reduce((s, c) => s + leaves(c), 0) : 1)
  const angle = new Map()
  const place = (n, from, span) => {
    angle.set(n, from + span / 2)
    let at0 = from
    for (const c of children.get(n)) {
      const share = (span * leaves(c)) / leaves(n)
      place(c, at0, share)
      at0 += share
    }
  }
  place(seed, -Math.PI / 2, Math.PI * 2)
  return { depth, angle, rings: Math.max(...depth.values()) }
}

function drawPieceGraph(svg, data) {
  const { nodes, edges, seed } = data.e1
  const src = data.models.source
  const cls = new Map()
  src.walls.forEach((w) => cls.set(w.id, 'wall'))
  src.floors.forEach((f) => cls.set(f.id, 'floor'))
  src.doors.forEach((d) => cls.set(d.id, 'door'))
  src.windows.forEach((w) => cls.set(w.id, 'window'))
  src.rooms.forEach((r) => cls.set(r.id, 'room'))
  const { depth, angle, rings } = pieceLayout(nodes, edges, seed)
  // the rings are ellipses, so a wide box is filled
  const [W, H] = [640, 330]
  const sx = (W / 2 - 24) / Math.max(rings, 1)
  const sy = (H / 2 - 20) / Math.max(rings, 1)
  const pos = new Map(nodes.map((n) => {
    const d = depth.get(n) ?? rings
    const a = angle.get(n) ?? 0
    return [n, [W / 2 + d * sx * Math.cos(a), H / 2 + d * sy * Math.sin(a)]]
  }))
  const el = (name, attrs) => {
    const e = document.createElementNS(SVG, name)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    return e
  }
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
  for (let k = 1; k <= rings; k++) svg.append(el('ellipse', { class: 'pg-ring', cx: W / 2, cy: H / 2, rx: k * sx, ry: k * sy }))
  for (const e of edges) {
    const a = pos.get(e.a)
    const b = pos.get(e.b)
    if (a && b) svg.append(el('line', { class: `pg-edge pg-edge--${e.kind}`, x1: a[0], y1: a[1], x2: b[0], y2: b[1] }))
  }
  for (const n of nodes) {
    const [x, y] = pos.get(n)
    const kind = cls.get(n) ?? 'wall'
    const g = el('g', { class: `pg-node pg-node--${kind}${n === seed ? ' is-seed' : ''}` })
    g.append(el('circle', { cx: x, cy: y, r: 15 }))
    LETTER[kind].forEach((letter, i) => {
      const t = el('text', { x, y, lang: i ? 'es' : 'en' })
      t.textContent = letter
      g.append(t)
    })
    svg.append(g)
  }
}

// ---- Mounting --------------------------------------------------------------------------------------------------

export async function mountSets(doc = document, url = 'views.json') {
  const hosts = [...doc.querySelectorAll('.model3d[data-mode="set"]')]
  const graphs = [...doc.querySelectorAll('svg.piecegraph')]
  if (!hosts.length && !graphs.length) return
  const data = await (await fetch(url)).json()
  graphs.forEach((svg) => drawPieceGraph(svg, data))
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let pal = paletteOf()

  const frames = {}
  const frameOf = (name) =>
    (frames[name] ??=
      name === 'piece'
        ? frameCamera(pieceBounds(data.models.source, data.e1.nodes), 0.6)
        : frameCamera(buildingBounds(data.models.source), 0.6))

  const views = hosts.map((host) => {
    const model = data.models[host.dataset.side] ?? data.models.source
    const make = SETS[host.dataset.set]
    const { camera, target } = frameOf(host.dataset.frame === 'piece' ? 'piece' : 'building')
    const canvas = doc.createElement('canvas')
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', host.dataset.label ?? host.dataset.set)
    host.prepend(canvas)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const controls = new OrbitControls(camera, canvas)
    controls.target = target
    controls.update()
    controls.addEventListener('change', () => renderAll())
    const total = totalOf(host)
    const view = { host, renderer, camera, total, step: stepOf(host, total), since: -Infinity, ...make(data, model, doc, host) }
    return view
  })

  const point = new THREE.Vector3()
  function render(view) {
    const { clientWidth: w, clientHeight: h } = view.host
    if (!w || !h) return
    const size = view.renderer.getSize(new THREE.Vector2())
    if (size.x !== w || size.y !== h) view.renderer.setSize(w, h, false)
    const { camera } = view
    camera.fov = Math.max(FOV, THREE.MathUtils.radToDeg(2 * Math.atan(HALF_WIDTH / (w / h))))
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    view.renderer.setClearColor(pal.panel, 1)
    view.renderer.render(view.scene, camera)
    for (const o of view.overlays) {
      if (!o.at) {
        o.el.hidden = !o.show(view.step)
        continue
      }
      point.copy(o.at).project(camera)
      o.el.hidden = point.z > 1 || !o.show(view.step)
      o.el.style.left = `${((point.x + 1) / 2) * 100}%`
      o.el.style.top = `${((1 - point.y) / 2) * 100}%`
    }
  }
  function renderAll() {
    views.forEach(render)
  }

  /** Draws a view at its step; while elements are still coming in, keeps drawing frame by frame. */
  function draw(view) {
    const moving = view.update(view.step, performance.now() - view.since, pal, view.total)
    render(view)
    if (moving) requestAnimationFrame(() => draw(view))
  }

  for (const view of views) {
    const slide = view.host.closest('.slide')
    const follow = () => {
      const next = stepOf(view.host, view.total)
      if (next === view.step) return
      // one step forward is told with its elements coming in; any other jump shows the step at once
      view.since = !reduced && next === view.step + 1 ? performance.now() : -Infinity
      view.step = next
      draw(view)
    }
    if (slide) new MutationObserver(follow).observe(slide, { attributes: true, attributeFilter: ['data-step', 'data-complete'] })
    draw(view)
  }

  const resize = new ResizeObserver(() => renderAll())
  views.forEach((v) => resize.observe(v.host))
  const repaint = () => {
    pal.dispose()
    pal = paletteOf()
    views.forEach((v) => {
      v.since = -Infinity
      draw(v)
    })
  }
  new MutationObserver(repaint).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint)
}
