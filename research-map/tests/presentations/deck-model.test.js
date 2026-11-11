// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

// the script writes a file when it is run; importing it must write nothing
const writes = vi.hoisted(() => vi.fn())
vi.mock('node:fs', async (original) => ({ ...(await original()), writeFileSync: writes }))

const { project } = await import('../../scripts/deck-model.mjs')
// counted here: vitest clears mocks before each test, so a count taken inside a test would prove nothing
const writesOnImport = writes.mock.calls.length

/** A pipeline project in feet, as `pipeline/out/source.json` has it: one wall with a door and a window hosted on it. */
const pipelineProject = () => ({
  levels: [
    { name: 'L1', elevation: 0 },
    { name: 'L2', elevation: 10 },
  ],
  walls: [{ id: 700, curve: { p: [[0, 0, 0], [10, 0, 0]] }, base_level: 'L1', base_offset: 0, height: 9, length: 10, curtain: false }],
  floors: [{ id: 800, loops: [[{ p: [[0, 0, 0]] }, { p: [[10, 0, 0]] }, { p: [[10, 10, 0]] }]] }],
  doors: [{ id: 701, point: [5, 0, 0], type: ['Single', 'M_Single 0915 x 2134mm'], host: 700, hand_flipped: false }],
  windows: [{ id: 702, point: [8, 0, 3], type: ['Fixed', 'Fixed 0600 x 1200mm'], host: 700, hand_flipped: true }],
  rooms: [{ id: 900, point: [2, 2, 0], area: 40 }],
})

describe('deck-model project', () => {
  it('keeps its output shape without hosts: an opening has no host key', () => {
    const out = project(pipelineProject())
    expect(Object.keys(out)).toEqual(['levels', 'walls', 'floors', 'doors', 'windows', 'rooms'])
    expect(out.doors[0]).not.toHaveProperty('host')
    expect(out.doors[0].w).toBe(0.915)
  })

  it('with withHost, doors and windows carry the id of their host wall', () => {
    const out = project(pipelineProject(), { withHost: true })
    expect(out.doors[0].host).toBe(700)
    expect(out.windows[0].host).toBe(700)
    expect(out.walls[0].id).toBe(700)
  })

  it('importing the module writes nothing', () => {
    expect(writesOnImport).toBe(0)
  })
})
