/*
 * E1's real graph on a slide (deck 07): `<div class="kgraph" data-src="graph.json">`. graph.json is written by
 * `scripts/deck-model.mjs --views` from pipeline/out/experiments/e1-tokens-bfs, so the slide shows whatever E1 last
 * produced. Every element is drawn at its point in plan, one panel per level, left to right; "on level" relations are
 * the panels themselves. The wheel zooms, a drag pans, a click on a node shows its tokens and its relations; a click on
 * the background clears it. "E1 piece" lights the 20 elements of the example piece.
 */
const SVG = 'http://www.w3.org/2000/svg'
const GAP = 10 // metres between two level panels
const R = { wall: 0.75, floor: 1.6, door: 0.6, window: 0.6, room: 0.9 }
const CLASS = { wall: ['wall', 'muro'], floor: ['floor', 'losa'], door: ['door', 'puerta'], window: ['window', 'ventana'], room: ['room', 'room'] }
/** A relation as read from the selected element: [en, es] when it is the first end, and when it is the second. */
const KIND = {
  hosted_by: [['hosted by', 'alojada en'], ['hosts', 'aloja']],
  joins: [['joins', 'se une con'], ['joins', 'se une con']],
  meets_floor: [['meets floor', 'toca losa'], ['holds wall', 'sostiene muro']],
  on_floor: [['on floor', 'sobre losa'], ['holds room', 'sostiene room']],
}
const LIST_MAX = 8

const el = (doc, name, attrs = {}, ns = SVG) => {
  const e = ns ? doc.createElementNS(ns, name) : doc.createElement(name)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  return e
}

/** Text in both languages, as the deck writes it. */
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

/**
 * Where each element goes on the drawing: its plan point, moved right by its level's panel. North is up. Returns the
 * points, the panels (level name, box) and the drawing's box.
 */
export function layoutGraph(graph) {
  const pts = graph.nodes.filter((n) => n.p)
  const minX = Math.min(...pts.map((n) => n.p[0]))
  const maxX = Math.max(...pts.map((n) => n.p[0]))
  const minY = Math.min(...pts.map((n) => n.p[1]))
  const maxY = Math.max(...pts.map((n) => n.p[1]))
  const width = maxX - minX
  const height = maxY - minY
  const used = graph.levels.map((l) => l.id.replace(/^level:/, '')).filter((name) => graph.nodes.some((n) => n.level === name))
  const panel = new Map(used.map((name, i) => [name, i]))
  const pos = new Map()
  for (const n of pts) {
    const i = panel.get(n.level) ?? 0
    pos.set(n.id, [n.p[0] - minX + i * (width + GAP), maxY - n.p[1]])
  }
  const panels = used.map((name, i) => ({ name, x: i * (width + GAP) - 2, y: -2, w: width + 4, h: height + 4 }))
  const box = { x: -GAP / 2, y: -GAP, w: used.length * (width + GAP), h: height + GAP * 1.6 }
  return { pos, panels, box }
}

export async function mountGraph(doc = document) {
  for (const host of doc.querySelectorAll('.kgraph')) {
    const graph = await (await fetch(host.dataset.src ?? 'graph.json')).json()
    draw(doc, host, graph)
    // the key's numbers are counted from the same file, so they follow the graph
    const count = { nodes: graph.nodes.length, edges: graph.edges.length }
    for (const e of graph.edges) count[e.kind] = (count[e.kind] ?? 0) + 1
    for (const b of host.closest('.slide')?.querySelectorAll('[data-count]') ?? [])
      b.textContent = (count[b.dataset.count] ?? 0).toLocaleString('en-US')
  }
}

function draw(doc, host, graph) {
  const { pos, panels, box } = layoutGraph(graph)
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const svg = el(doc, 'svg', { class: 'kgraph__svg', role: 'img', 'aria-label': `${graph.nodes.length} elements and ${graph.edges.length} relations` })
  const gPanels = el(doc, 'g')
  const gEdges = el(doc, 'g')
  const gNodes = el(doc, 'g')
  svg.append(gPanels, gEdges, gNodes)
  for (const p of panels) {
    gPanels.append(el(doc, 'rect', { class: 'kg-panel', x: p.x, y: p.y, width: p.w, height: p.h, rx: 1.5 }))
    const label = el(doc, 'text', { class: 'kg-panel__label', x: p.x + 1, y: p.y - 2.2 })
    label.textContent = p.name
    gPanels.append(label)
  }

  // relations between elements; "on level" is the panel an element sits in
  const links = new Map(graph.nodes.map((n) => [n.id, []]))
  const lines = []
  for (const e of graph.edges) {
    if (e.kind === 'on_level' || !pos.has(e.a) || !pos.has(e.b)) continue
    const [x1, y1] = pos.get(e.a)
    const [x2, y2] = pos.get(e.b)
    const line = el(doc, 'line', { class: `kg-edge kg-edge--${e.kind}`, x1, y1, x2, y2 })
    gEdges.append(line)
    lines.push({ e, line })
    links.get(e.a)?.push({ other: e.b, kind: e.kind, first: true, line })
    links.get(e.b)?.push({ other: e.a, kind: e.kind, first: false, line })
  }
  const dots = new Map()
  for (const n of graph.nodes) {
    if (!pos.has(n.id)) continue
    const [cx, cy] = pos.get(n.id)
    const dot = el(doc, 'circle', { class: `kg-node kg-node--${n.cls}`, cx, cy, r: R[n.cls] ?? 0.7, 'data-id': n.id })
    gNodes.append(dot)
    dots.set(n.id, dot)
  }
  host.append(svg)

  // the card for a selected element, the controls, the key
  const info = doc.createElement('div')
  info.className = 'kgraph__info'
  info.hidden = true
  const tools = doc.createElement('div')
  tools.className = 'kgraph__tools'
  const reset = both(doc, '⟲ Fit', '⟲ Encuadrar', 'button')
  const piece = both(doc, 'E1 piece', 'Pieza de E1', 'button')
  reset.type = piece.type = 'button'
  tools.append(reset, piece)
  const hint = both(doc, 'wheel: zoom · drag: move · click a node', 'rueda: zoom · arrastrar: mover · clic en un nodo', 'p')
  hint.className = 'kgraph__hint'
  host.append(info, tools, hint)

  // ---- view: the viewBox zooms and pans
  let view = { ...box }
  const apply = () => svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`)
  apply()
  const toGraph = (clientX, clientY) => {
    const r = svg.getBoundingClientRect()
    // preserveAspectRatio meet: the drawing is scaled by the smaller ratio and centred
    const s = Math.min(r.width / view.w, r.height / view.h)
    const ox = (r.width - view.w * s) / 2
    const oy = (r.height - view.h * s) / 2
    return [view.x + (clientX - r.left - ox) / s, view.y + (clientY - r.top - oy) / s, s]
  }
  svg.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault()
      const [gx, gy] = toGraph(ev.clientX, ev.clientY)
      const f = Math.exp(ev.deltaY * 0.0015)
      const w = Math.min(box.w * 1.5, Math.max(box.w / 40, view.w * f))
      const k = w / view.w
      view = { x: gx - (gx - view.x) * k, y: gy - (gy - view.y) * k, w, h: view.h * k }
      apply()
    },
    { passive: false },
  )
  let drag = null
  svg.addEventListener('pointerdown', (ev) => {
    // the node under the press, read now: once the pointer is captured, the release lands on the svg itself
    drag = { x: ev.clientX, y: ev.clientY, view: { ...view }, moved: false, id: ev.target?.dataset?.id }
    svg.setPointerCapture(ev.pointerId)
  })
  svg.addEventListener('pointermove', (ev) => {
    if (!drag) return
    const dx = ev.clientX - drag.x
    const dy = ev.clientY - drag.y
    if (Math.hypot(dx, dy) > 3) drag.moved = true
    if (!drag.moved) return
    const s = toGraph(ev.clientX, ev.clientY)[2]
    view = { ...drag.view, x: drag.view.x - dx / s, y: drag.view.y - dy / s }
    apply()
  })
  svg.addEventListener('pointerup', (ev) => {
    const { moved, id } = drag ?? {}
    drag = null
    if (moved) return
    select(id ? Number(id) : null)
  })
  reset.addEventListener('click', () => {
    view = { ...box }
    apply()
  })

  // ---- selection: the element, its relations, its neighbours
  let pieceOn = false
  const pieceSet = new Set(graph.piece?.nodes ?? [])
  piece.addEventListener('click', () => {
    pieceOn = !pieceOn
    piece.classList.toggle('is-on', pieceOn)
    select(null)
  })
  function clear() {
    svg.classList.remove('is-focus')
    for (const d of dots.values()) d.classList.remove('is-sel', 'is-near', 'is-piece', 'is-seed')
    for (const { line } of lines) line.classList.remove('is-lit')
  }
  function showPiece() {
    if (!pieceOn) return
    svg.classList.add('is-focus')
    for (const id of pieceSet) dots.get(id)?.classList.add('is-piece')
    dots.get(graph.piece.seed)?.classList.add('is-seed')
    for (const { e, line } of lines) if (pieceSet.has(e.a) && pieceSet.has(e.b)) line.classList.add('is-lit')
  }
  function select(id) {
    clear()
    if (id == null || !byId.has(id)) {
      info.hidden = true
      showPiece()
      return
    }
    svg.classList.add('is-focus')
    dots.get(id)?.classList.add('is-sel')
    for (const l of links.get(id) ?? []) {
      l.line.classList.add('is-lit')
      dots.get(l.other)?.classList.add('is-near')
    }
    fill(id)
  }
  function name(id) {
    const n = byId.get(id)
    const type = (n?.tokens.find((t) => t.startsWith('TYPE:')) ?? '').slice(5).split(' | ').pop()
    const [en, es] = CLASS[n?.cls] ?? [n?.cls, n?.cls]
    return { en: `${en} ${id}${type ? ` · ${type}` : ''}`, es: `${es} ${id}${type ? ` · ${type}` : ''}` }
  }
  function fill(id) {
    const n = byId.get(id)
    info.replaceChildren()
    const head = doc.createElement('p')
    head.className = 'kgraph__head'
    const [en, es] = CLASS[n.cls] ?? [n.cls, n.cls]
    head.append(both(doc, `${en} ${id}`, `${es} ${id}`), Object.assign(doc.createElement('small'), { textContent: n.level }))
    const chips = doc.createElement('p')
    chips.className = 'kgraph__tokens'
    for (const t of n.tokens) chips.append(Object.assign(doc.createElement('code'), { textContent: t }))
    info.append(head, chips)
    // relations grouped by what they say from this element
    const groups = new Map()
    for (const l of links.get(id) ?? []) {
      const label = KIND[l.kind]?.[l.first ? 0 : 1] ?? [l.kind, l.kind]
      const key = label.join('|')
      if (!groups.has(key)) groups.set(key, { label, items: [] })
      groups.get(key).items.push(l.other)
    }
    const list = doc.createElement('ul')
    list.className = 'kgraph__rels'
    const total = [...groups.values()].reduce((s, g) => s + g.items.length, 0)
    const count = both(doc, `${total} relations, plus “on level”`, `${total} relaciones, más “en nivel”`, 'p')
    count.className = 'kgraph__count'
    for (const g of groups.values()) {
      const li = doc.createElement('li')
      const title = both(doc, `${g.label[0]} · ${g.items.length}`, `${g.label[1]} · ${g.items.length}`, 'b')
      li.append(title)
      for (const other of g.items.slice(0, LIST_MAX)) {
        const t = name(other)
        const row = both(doc, t.en, t.es, 'span')
        row.className = 'kgraph__rel'
        row.dataset.id = other
        li.append(row)
      }
      if (g.items.length > LIST_MAX) li.append(both(doc, `+${g.items.length - LIST_MAX} more`, `+${g.items.length - LIST_MAX} más`, 'small'))
      list.append(li)
    }
    info.append(count, list)
    info.hidden = false
  }
  // a related element in the card can be clicked too
  info.addEventListener('click', (ev) => {
    const row = ev.target.closest?.('.kgraph__rel')
    if (row) select(Number(row.dataset.id))
  })
}
