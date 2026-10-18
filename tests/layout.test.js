import { describe, expect, it } from 'vitest'
import { boxOf, layout, linkPath } from '../assets/layout.js'

const map = (counts) => {
  const groups = counts.map((_, i) => ({ id: `g${i}`, title: `Group ${i}`, colour: `g${(i % 8) + 1}`, date: '2026-10-18' }))
  const nodes = counts.flatMap((n, i) =>
    Array.from({ length: n }, (_, k) => ({
      id: `n${i}-${k}`, kind: 'paper', group: `g${i}`, title: `Node ${k}`, date: `2026-10-${String(10 + (k % 20)).padStart(2, '0')}`,
    })),
  )
  return { version: 1, lastPresentation: null, centre: { question: [], hypothesis: [] }, groups, nodes, links: [] }
}

const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2
const boxes = (l) => [l.centre, ...l.groups, ...l.nodes]

/** The angle of a point, in the same turn as a sector that starts at angle0. */
const angleIn = (p, angle0) => {
  let a = Math.atan2(p.y, p.x)
  while (a < angle0) a += 2 * Math.PI
  while (a >= angle0 + 2 * Math.PI) a -= 2 * Math.PI
  return a
}

describe('layout', () => {
  it('an empty map is the centre card alone', () => {
    const l = layout(map([]))
    expect(l.centre).toMatchObject({ x: 0, y: 0 })
    expect(l.groups).toEqual([])
    expect(l.nodes).toEqual([])
  })

  it('one group of one node: its label and the node sit apart from the centre', () => {
    const l = layout(map([1]))
    expect(l.nodes).toHaveLength(1)
    const all = boxes(l)
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(overlap(all[i], all[j])).toBe(false)
  })

  it('150 nodes in 8 uneven groups: no two cards overlap, each node stays in its sector', () => {
    const l = layout(map([60, 40, 20, 10, 10, 5, 4, 1]))
    expect(l.nodes).toHaveLength(150)
    const all = boxes(l)
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) expect(overlap(all[i], all[j]), `${all[i].id} × ${all[j].id}`).toBe(false)
    const sector = Object.fromEntries(l.groups.map((g) => [g.id, g]))
    for (const n of l.nodes) {
      const g = sector[`g${n.id.slice(1).split('-')[0]}`]
      const a = angleIn(n, g.angle0)
      expect(a).toBeGreaterThanOrEqual(g.angle0)
      expect(a).toBeLessThanOrEqual(g.angle1)
    }
    const turn = l.groups.reduce((s, g) => s + g.angle1 - g.angle0, 0)
    expect(turn).toBeCloseTo(2 * Math.PI)
  })

  it('a group with no nodes still has its sector and label', () => {
    const l = layout(map([3, 0]))
    expect(l.groups.map((g) => g.id)).toEqual(['g0', 'g1'])
    expect(l.groups[1].angle1 - l.groups[1].angle0).toBeGreaterThan(0)
  })

  it('the same data in any order gives the same picture', () => {
    const m = map([5, 3])
    const shuffled = { ...m, nodes: [...m.nodes].reverse() }
    expect(layout(shuffled)).toEqual(layout(m))
  })

  it('a collapsed group is one card; its nodes and links attach to it', () => {
    const m = map([4, 2])
    const l = layout(m, { collapsed: new Set(['g0']) })
    expect(l.nodes.map((n) => n.id)).toEqual(['n1-0', 'n1-1'])
    const g0 = l.groups.find((g) => g.id === 'g0')
    expect(g0.collapsed).toBe(true)
    expect(boxOf(l, m, 'n0-2')).toBe(g0)
    expect(boxOf(l, m, 'n1-0')).toBe(l.nodes[0])
  })

  it('the centre parts are its two halves', () => {
    const l = layout(map([1]))
    const q = boxOf(l, map([1]), 'question')
    const h = boxOf(l, map([1]), 'hypothesis')
    expect(q.y).toBeLessThan(0)
    expect(h.y).toBeGreaterThan(0)
    expect(q.w).toBe(l.centre.w)
  })
})

describe('linkPath', () => {
  it('a curve from edge to edge, not centre to centre', () => {
    const a = { x: 0, y: 0, w: 100, h: 40 }
    const b = { x: 300, y: 0, w: 100, h: 40 }
    const d = linkPath(a, b)
    expect(d).toMatch(/^M 50 0 C /)
    expect(d).toMatch(/ 250 0$/)
  })
})
