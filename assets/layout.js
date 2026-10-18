/*
 * Where every card goes: the centre card at (0, 0), each group a sector around it (its angle proportional to its node
 * count), the group's label and nodes on rings inside the sector. Pure and deterministic: same data, same picture.
 *
 * Why nothing overlaps: two cards of CARD_W × CARD_H cannot touch when their centres are more than their diagonal
 * (~210) apart. Rings are SLOT apart, and along a ring neighbours are a chord of at least SLOT apart, including across
 * a sector boundary (each card keeps half a slot of its sector to each side).
 */

export const CARD_W = 200
export const CARD_H = 64
export const CENTRE_W = 360
export const CENTRE_H = 200
const SLOT = 230
const FIRST_RING = 340
const MIN_WEIGHT = 2

const byDateThenId = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** The smallest angle between two neighbours on a ring of radius r. */
const step = (r) => 2 * Math.asin(Math.min(1, SLOT / (2 * r)))

/**
 * Places `count` items in the sector [a0, a1], ring after ring; returns their centres. Each ring takes as many as fit,
 * spread evenly, so a sector's cards stay inside it.
 */
function fill(count, a0, a1) {
  const out = []
  let r = FIRST_RING
  while (out.length < count) {
    const fit = Math.floor((a1 - a0) / step(r))
    const here = Math.min(fit, count - out.length)
    for (let i = 0; i < here; i++) {
      const a = a0 + ((i + 0.5) * (a1 - a0)) / here
      out.push({ x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) })
    }
    r += SLOT
  }
  return out
}

/**
 * The picture of a map. Groups keep the map's order, clockwise from the top; a collapsed group shows only its label.
 * Returns { centre, groups: [{ id, angle0, angle1, collapsed, x, y, w, h }], nodes: [{ id, x, y, w, h }] }.
 */
export function layout(map, { collapsed = new Set() } = {}) {
  const centre = { id: 'centre', x: 0, y: 0, w: CENTRE_W, h: CENTRE_H }
  const members = Object.fromEntries(map.groups.map((g) => [g.id, []]))
  for (const n of map.nodes) members[n.group]?.push(n)

  const weight = (g) => (collapsed.has(g.id) ? 1 : Math.max(MIN_WEIGHT, members[g.id].length + 1))
  const total = map.groups.reduce((s, g) => s + weight(g), 0)

  const groups = []
  const nodes = []
  let a = -Math.PI / 2
  for (const g of map.groups) {
    const a0 = a
    const a1 = a + (2 * Math.PI * weight(g)) / total
    a = a1
    const isCollapsed = collapsed.has(g.id)
    const own = isCollapsed ? [] : [...members[g.id]].sort(byDateThenId)
    // The label takes the middle place of the first ring; the nodes fill the rest in date order.
    const places = fill(own.length + 1, a0, a1)
    const firstRing = places.filter((p) => Math.abs(Math.hypot(p.x, p.y) - FIRST_RING) < 1).length
    const labelAt = Math.floor(firstRing / 2)
    const [label] = places.splice(labelAt, 1)
    groups.push({ id: g.id, angle0: a0, angle1: a1, collapsed: isCollapsed, ...label, w: CARD_W, h: CARD_H })
    own.forEach((n, i) => nodes.push({ id: n.id, ...places[i], w: CARD_W, h: CARD_H }))
  }
  return { centre, groups, nodes }
}

/**
 * The card a link end attaches to: a node's own card, or its group's card when the group is collapsed; a group's
 * label; the top (question) or bottom (hypothesis) half of the centre card.
 */
export function boxOf(l, map, id) {
  if (id === 'question' || id === 'hypothesis') {
    const c = l.centre
    return { id, x: c.x, y: c.y + (id === 'question' ? -c.h / 4 : c.h / 4), w: c.w, h: c.h / 2 }
  }
  const node = l.nodes.find((n) => n.id === id)
  if (node) return node
  const group = l.groups.find((g) => g.id === id)
  if (group) return group
  const owner = map.nodes.find((n) => n.id === id)?.group
  return l.groups.find((g) => g.id === owner) ?? null
}

/** Where the line from a box's centre towards (tx, ty) leaves the box. */
function edge(box, tx, ty) {
  const dx = tx - box.x
  const dy = ty - box.y
  if (dx === 0 && dy === 0) return { x: box.x, y: box.y }
  const t = Math.min(dx === 0 ? Infinity : box.w / 2 / Math.abs(dx), dy === 0 ? Infinity : box.h / 2 / Math.abs(dy))
  return { x: box.x + dx * t, y: box.y + dy * t }
}

const r1 = (n) => Math.round(n * 10) / 10

/** An SVG path from box a's edge to box b's edge, bowed gently to one side so crossing links stay apart. */
export function linkPath(a, b) {
  const p = edge(a, b.x, b.y)
  const q = edge(b, a.x, a.y)
  const dx = q.x - p.x
  const dy = q.y - p.y
  const bow = 0.15
  const c1 = { x: p.x + dx / 3 - dy * bow, y: p.y + dy / 3 + dx * bow }
  const c2 = { x: p.x + (2 * dx) / 3 - dy * bow, y: p.y + (2 * dy) / 3 + dx * bow }
  return `M ${r1(p.x)} ${r1(p.y)} C ${r1(c1.x)} ${r1(c1.y)} ${r1(c2.x)} ${r1(c2.y)} ${r1(q.x)} ${r1(q.y)}`
}
