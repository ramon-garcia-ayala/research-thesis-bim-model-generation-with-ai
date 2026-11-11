// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  PHASES,
  PLACES,
  delayOf,
  ease,
  edgesOf,
  isMasked,
  levelOf,
  placeOf,
  pointsOf,
  targetOf,
} from '../../presentations/assets/pitch-building.js'

/** Metres, plan x, y with z up, as `scripts/deck-model.mjs --deck=` writes it: a 3 m wall, a 4 m floor, a door and a window on the wall. */
const model = () => ({
  source: {
    levels: [
      { name: 'L1', z: 0 },
      { name: 'L2', z: 3 },
    ],
    walls: [{ id: 1, a: [0, 0], b: [3, 0], z: 0, h: 2.7, len: 3, curtain: false }],
    floors: [{ id: 2, z: 0, pts: [[0, 0], [4, 0], [4, 4], [0, 4]] }],
    doors: [{ id: 3, p: [1, 0, 0], w: 0.9, h: 2.1, dir: [1, 0], hand: false, host: 1 }],
    windows: [{ id: 4, p: [2, 0, 0.9], w: 0.9, h: 1.2, dir: [1, 0], hand: false, host: 1 }],
    rooms: [{ id: 5, p: [2, 2, 0], a: 16 }],
  },
})

describe('pointsOf', () => {
  it('samples a wall inside its own extent', () => {
    const wall = pointsOf(model()).filter((p) => p.kind === 'wall')
    expect(wall.length).toBeGreaterThanOrEqual(12)
    for (const p of wall) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(3)
      expect(p.y).toBe(0)
      expect(p.z).toBeGreaterThanOrEqual(0)
      expect(p.z).toBeLessThanOrEqual(2.7)
      expect(p.id).toBe(1)
    }
  })

  it('has points of every kind, one `first` per element, centroids and levels', () => {
    const pts = pointsOf(model())
    expect(new Set(pts.map((p) => p.kind))).toEqual(new Set(['wall', 'floor', 'door', 'window', 'room']))
    expect(pts.filter((p) => p.first)).toHaveLength(5)
    const wall = pts.find((p) => p.kind === 'wall')
    expect([wall.cx, wall.cy, wall.cz]).toEqual([1.5, 0, 1.35])
    expect(wall.level).toBe(0)
  })

  it('is deterministic and honours max without losing an element', () => {
    expect(pointsOf(model())).toEqual(pointsOf(model()))
    const thin = pointsOf(model(), { max: 10 })
    expect(thin.length).toBeLessThanOrEqual(10)
    expect(new Set(thin.map((p) => p.id))).toEqual(new Set([1, 2, 3, 4, 5]))
  })
})

describe('levelOf', () => {
  const levels = [{ z: 0 }, { z: 3 }, { z: 7.6 }]
  it('picks the highest level at or below the height', () => {
    expect(levelOf(0, levels)).toBe(0)
    expect(levelOf(2.99, levels)).toBe(1) // within 5 cm of a level counts as on it
    expect(levelOf(5, levels)).toBe(1)
    expect(levelOf(9, levels)).toBe(2)
    expect(levelOf(-1, levels)).toBe(0)
  })
})

describe('edgesOf', () => {
  it('has one edge per opening hosted on a wall', () => {
    expect(edgesOf(model())).toEqual([{ a: 3, b: 1 }, { a: 4, b: 1 }])
  })
  it('ignores a host that is not a wall of the model', () => {
    const m = model()
    m.source.doors.push({ id: 6, p: [0, 0, 0], w: 1, h: 2, dir: [1, 0], hand: false, host: 999 })
    expect(edgesOf(m)).toHaveLength(2)
  })
})

describe('targetOf', () => {
  const pts = () => pointsOf(model())
  const ctx = { gap: 6 }
  const first = (kind) => pts().find((p) => p.kind === kind && p.first)

  it('is invisible when off, and assembled but quiet as a motif', () => {
    const p = first('wall')
    expect(targetOf(p, 'off', ctx).a).toBe(0)
    expect(targetOf(p, 'motif', ctx)).toEqual({ x: p.x, y: p.y, z: p.z, a: 0.9 })
  })

  it('lifts a point by its level times the gap when exploded', () => {
    const p = { ...first('wall'), level: 2 }
    expect(targetOf(p, 'exploded', ctx)).toEqual({ x: p.x, y: p.y, z: p.z + 12, a: 1 })
  })

  it('keeps only the first point of an element in the graph, at its centroid', () => {
    const wall = pts().filter((p) => p.kind === 'wall')
    const shown = wall.filter((p) => targetOf(p, 'graph', ctx).a === 1)
    expect(shown).toHaveLength(1)
    const t = targetOf(shown[0], 'graph', ctx)
    expect([t.x, t.y, t.z]).toEqual([shown[0].cx, shown[0].cy, shown[0].cz])
  })

  it('dims the openings to 0.1 when masked and leaves a wall at 1', () => {
    expect(targetOf(first('door'), 'masked', ctx).a).toBe(0.1)
    expect(targetOf(first('window'), 'masked', ctx).a).toBe(0.1)
    expect(targetOf(first('wall'), 'masked', ctx).a).toBe(1)
    expect(isMasked(first('door'))).toBe(true)
    expect(isMasked(first('wall'))).toBe(false)
  })

  it('is whole again when rebuilt', () => {
    expect(targetOf(first('door'), 'rebuilt', ctx).a).toBe(1)
    const p = first('door')
    expect(targetOf(p, 'rebuilt', ctx)).toMatchObject({ x: p.x, y: p.y, z: p.z })
  })
})

describe('motion helpers', () => {
  it('ease is a clamped easeInOutSine', () => {
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    expect(ease(0.5)).toBeCloseTo(0.5, 10)
    expect(ease(-3)).toBe(0)
    expect(ease(4)).toBe(1)
    let prev = -1
    for (let t = 0; t <= 1; t += 0.05) {
      expect(ease(t)).toBeGreaterThanOrEqual(prev)
      prev = ease(t)
    }
  })

  it('delayOf is stable and within [0, 1)', () => {
    const p = pointsOf(model())[0]
    expect(delayOf(p)).toBe(delayOf({ ...p }))
    for (const q of pointsOf(model())) {
      expect(delayOf(q)).toBeGreaterThanOrEqual(0)
      expect(delayOf(q)).toBeLessThan(1)
    }
  })

  it('knows its phases and places; an unknown place is the full one', () => {
    expect(PHASES).toEqual(['off', 'exploded', 'graph', 'masked', 'rebuilt', 'motif'])
    expect(Object.keys(PLACES).sort()).toEqual(['corner', 'full', 'left', 'right'])
    expect(placeOf('nowhere')).toBe(PLACES.full)
    expect(placeOf('right')).toBe(PLACES.right)
  })
})
