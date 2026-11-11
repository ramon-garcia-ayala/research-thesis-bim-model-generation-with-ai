import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mountBuilding, project3 } from '../../presentations/assets/pitch-building.js'

const model = () => ({
  source: {
    levels: [{ name: 'L1', z: 0 }, { name: 'L2', z: 3 }],
    walls: [{ id: 1, a: [0, 0], b: [3, 0], z: 0, h: 2.7, len: 3, curtain: false }],
    floors: [{ id: 2, z: 0, pts: [[0, 0], [4, 0], [4, 4], [0, 4]] }],
    doors: [{ id: 3, p: [1, 0, 0], w: 0.9, h: 2.1, dir: [1, 0], hand: false, host: 1 }],
    windows: [],
    rooms: [],
  },
})

/** A 2D context that records nothing and accepts everything. */
const fakeContext = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) })

const stageWith = () => {
  document.body.innerHTML = `<main class="deck"><div class="stage">
    <section class="slide" data-phase="graph" data-place="left">one</section>
    <section class="slide" data-phase="rebuilt" data-place="right" hidden>two</section></div></main>`
  return [...document.querySelectorAll('.stage section.slide')]
}

describe('mountBuilding', () => {
  const original = HTMLCanvasElement.prototype.getContext
  let building = null
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = () => fakeContext()
    delete document.body.dataset.pitchState
  })
  afterEach(() => {
    building?.destroy()
    building = null
    HTMLCanvasElement.prototype.getContext = original
  })

  it('returns null without a stage', () => {
    document.body.innerHTML = '<main class="deck"></main>'
    expect(mountBuilding(window, model())).toBeNull()
  })

  it('returns null, and leaves no canvas, when the canvas has no context', () => {
    stageWith()
    HTMLCanvasElement.prototype.getContext = () => null
    expect(mountBuilding(window, model())).toBeNull()
    expect(document.querySelector('canvas.pitch-building')).toBeNull()
  })

  it("starts on the shown slide's phase and place", () => {
    stageWith()
    building = mountBuilding(window, model())
    expect(building.phase()).toBe('graph')
    expect(building.place()).toBe('left')
    expect(document.querySelector('.stage > canvas.pitch-building')).not.toBeNull()
  })

  it('follows deck:slide', () => {
    const [, second] = stageWith()
    building = mountBuilding(window, model())
    document.dispatchEvent(new CustomEvent('deck:slide', { detail: { index: 1, slide: second, total: 2 } }))
    expect(building.phase()).toBe('rebuilt')
    expect(building.place()).toBe('right')
  })

  it('settles at once when the pitch returns to ready in the middle of a tween', async () => {
    const [first] = stageWith()
    first.dataset.phase = 'rebuilt'
    document.body.dataset.pitchState = 'running'
    building = mountBuilding(window, model())
    expect(building.visible()).toBe(0) // tweening in: the clock has not moved yet
    document.body.dataset.pitchState = 'ready' // a restart: the ready screen shows every slide complete
    await new Promise((r) => setTimeout(r, 0)) // let the state observer run
    expect(building.visible()).toBeGreaterThan(0)
  })

  it('destroy removes the canvas and stops following', () => {
    const [, second] = stageWith()
    building = mountBuilding(window, model())
    building.destroy()
    expect(document.querySelector('canvas.pitch-building')).toBeNull()
    document.dispatchEvent(new CustomEvent('deck:slide', { detail: { index: 1, slide: second, total: 2 } }))
    expect(building.phase()).toBe('graph')
    building = null
  })
})

describe('project3', () => {
  it('at yaw 0 and pitch 0 maps plan x to screen x and z up to screen y negative', () => {
    expect(project3({ x: 2, y: 5, z: 3 }, { yaw: 0, pitch: 0 })).toEqual({ x: 2, y: -3, depth: 5 })
  })
  it('a quarter turn of yaw swaps the plan axes', () => {
    const p = project3({ x: 2, y: 0, z: 0 }, { yaw: Math.PI / 2, pitch: 0 })
    expect(p.x).toBeCloseTo(0, 10)
    expect(p.depth).toBeCloseTo(2, 10)
  })
  it('looking down (pitch) pushes the far side of the plan up the screen', () => {
    const near = project3({ x: 0, y: 0, z: 0 }, { yaw: 0, pitch: 0.5 })
    const far = project3({ x: 0, y: 10, z: 0 }, { yaw: 0, pitch: 0.5 })
    expect(far.y).toBeLessThan(near.y)
  })
})
