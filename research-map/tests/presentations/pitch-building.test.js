// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  PHASES,
  PLACES,
  ease,
  edgesOf,
  fitOf,
  geometryOf,
  iso,
  levelOf,
  mix,
  phaseVector,
  placeOf,
  rgbOf,
} from '../../presentations/assets/pitch-building.js'

/** Metres, plan x, y with z up, as `scripts/deck-model.mjs --deck=` writes it: two levels, a wall on each, a door and a window. */
const model = () => ({
  source: {
    levels: [
      { name: '01 - Entry Level', z: 0 },
      { name: '02 - Floor', z: 3.8 },
    ],
    walls: [
      { id: 1, a: [0, 0], b: [6, 0], z: 0, h: 3.8, len: 6, curtain: false },
      { id: 2, a: [0, 4], b: [6, 4], z: 3.8, h: 3.8, len: 6, curtain: true },
    ],
    floors: [
      { id: 3, z: 0, pts: [[0, 0], [6, 0], [6, 4], [0, 4]] },
      { id: 4, z: 3.8, pts: [[0, 0], [6, 0], [6, 4], [0, 4]] },
    ],
    doors: [{ id: 5, p: [2, 0, 0], w: 0.9, h: 2.1, dir: [1, 0], hand: false, host: 1 }],
    windows: [{ id: 6, p: [3, 4, 4.7], w: 0.9, h: 1.2, dir: [1, 0], hand: false, host: 2 }],
    rooms: [{ id: 7, p: [3, 2, 0], a: 24 }],
  },
})

describe('geometryOf', () => {
  it('groups the elements by level and names the levels without their number prefix', () => {
    const g = geometryOf(model())
    expect(g.levels.map((l) => l.name)).toEqual(['Entry Level', 'Floor'])
    // no counts per stratum: an opening takes its host wall's level, so they would not match the pipeline's own
    expect(g.levels[0]).not.toHaveProperty('walls')
    expect(g.levels[0]).not.toHaveProperty('openings')
    expect(g.walls.map((w) => w.level)).toEqual([0, 1])
    expect(g.floors.map((f) => f.level)).toEqual([0, 1])
    expect(g.openings.map((o) => [o.kind, o.level])).toEqual([
      ['door', 0],
      ['window', 1],
    ])
  })

  it('links each opening to the index of its host wall', () => {
    const g = geometryOf(model())
    expect(g.openings.map((o) => o.host)).toEqual([0, 1])
  })

  it('knows the plan bounds and the height of the building', () => {
    const g = geometryOf(model())
    expect(g.bounds).toEqual({ x0: 0, x1: 6, y0: 0, y1: 4, z0: 0, z1: 7.6 })
    expect(g.center).toEqual([3, 2])
  })

  it('drops levels that hold nothing', () => {
    const m = model()
    m.source.levels.push({ name: 'Parapet', z: 12 })
    expect(geometryOf(m).levels).toHaveLength(2)
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
    expect(edgesOf(model())).toEqual([{ a: 5, b: 1 }, { a: 6, b: 2 }])
  })
  it('ignores a host that is not a wall of the model', () => {
    const m = model()
    m.source.doors.push({ id: 8, p: [0, 0, 0], w: 1, h: 2, dir: [1, 0], hand: false, host: 999 })
    expect(edgesOf(m)).toHaveLength(2)
  })
})

describe('phaseVector', () => {
  it('is invisible when off', () => {
    expect(phaseVector('off').alpha).toBe(0)
  })
  it('opens the strata, with their labels, when exploded', () => {
    expect(phaseVector('exploded')).toMatchObject({ alpha: 1, explode: 1, labels: 1, graph: 0, mask: 0, ember: 0 })
  })
  it('turns the model into its graph, and masks the openings of the graph', () => {
    expect(phaseVector('graph')).toMatchObject({ graph: 1, mask: 0 })
    expect(phaseVector('masked')).toMatchObject({ graph: 1, mask: 1 })
  })
  it('puts it back, the placed openings in the accent, when rebuilt', () => {
    expect(phaseVector('rebuilt')).toMatchObject({ explode: 0, graph: 0, mask: 0, ember: 1 })
  })
  it('is assembled and quieter as a motif; anything unknown is off', () => {
    expect(phaseVector('motif').explode).toBe(0)
    expect(phaseVector('motif').alpha).toBeLessThan(1)
    expect(phaseVector('nonsense')).toEqual(phaseVector('off'))
  })
})

describe('mix and ease', () => {
  it('mix goes from one vector to another', () => {
    expect(mix({ a: 0, b: 2 }, { a: 1, b: 4 }, 0.5)).toEqual({ a: 0.5, b: 3 })
  })
  it('ease is a clamped easeInOutSine', () => {
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    expect(ease(0.5)).toBeCloseTo(0.5, 10)
    expect(ease(-3)).toBe(0)
    expect(ease(4)).toBe(1)
  })
})

describe('iso', () => {
  it('draws plan x down-right and z up, like the portfolio', () => {
    const p = iso({ x: 1, y: 0, z: 0 }, { yaw: 0, tilt: 1 })
    expect(p.x).toBeCloseTo(0.866, 3)
    expect(p.y).toBeCloseTo(0.5, 3)
    expect(iso({ x: 0, y: 0, z: 2 }, { yaw: 0, tilt: 1 }).y).toBe(-2)
  })
})

describe('fitOf', () => {
  it('keeps the exploded building inside its place, with room for the labels', () => {
    const g = geometryOf(model())
    const W = 1000
    const H = 562
    const place = PLACES.right
    const cam = { yaw: 0.5, tilt: 0.5 }
    const f = fitOf(g, place, W, H, cam, { gap: 6, explode: 1, labels: 0.28 })
    const at = (x, y, z) => {
      const p = iso({ x: x - g.center[0], y: y - g.center[1], z }, cam) // the view turns about the plan's centre
      return [f.ox + p.x * f.k, f.oy + p.y * f.k]
    }
    const top = g.bounds.z1 + (g.levels.length - 1) * 6
    for (const x of [g.bounds.x0, g.bounds.x1])
      for (const y of [g.bounds.y0, g.bounds.y1])
        for (const z of [0, top]) {
          const [sx, sy] = at(x, y, z)
          expect(sx).toBeGreaterThanOrEqual(place.x * W - 1)
          expect(sx).toBeLessThanOrEqual((place.x + place.w * (1 - 0.28)) * W + 1)
          expect(sy).toBeGreaterThanOrEqual(place.y * H - 1)
          expect(sy).toBeLessThanOrEqual((place.y + place.h) * H + 1)
        }
  })
})

describe('rgbOf and places', () => {
  it('reads a token colour as rgb', () => {
    expect(rgbOf('#f0603a')).toEqual([240, 96, 58])
    expect(rgbOf('rgba(238, 237, 233, 0.6)')).toEqual([238, 237, 233])
    expect(rgbOf('', [1, 2, 3])).toEqual([1, 2, 3])
  })
  it('knows its phases and places; an unknown place is the full one', () => {
    expect(PHASES).toEqual(['off', 'exploded', 'graph', 'masked', 'rebuilt', 'motif'])
    expect(Object.keys(PLACES).sort()).toEqual(['corner', 'full', 'left', 'right'])
    expect(placeOf('nowhere')).toBe(PLACES.full)
  })
})
