import { cpSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildGraph, extractJson, graphPrompt } from '../../scripts/papers/graph.mjs'

const FIXTURE = join(import.meta.dirname, '..', 'fixture')
const fixture = (path) => JSON.parse(readFileSync(join(FIXTURE, path), 'utf8'))
const paper = fixture('papers/sample-a/paper.json')
const map = fixture('map.json')
const date = '2026-10-22'

// What the model would reply: the fixture graph's ideas, edges and thesis links, without the fields buildGraph sets.
const { ideas, edges, thesis } = fixture('papers/sample-a/graph.json')
const validGraph = { ideas: ideas.map(({ origin, ...i }) => i), edges, thesis }
const graphCiting = (block) => ({ ...validGraph, ideas: [{ ...validGraph.ideas[0], blocks: [block] }, ...validGraph.ideas.slice(1)] })

let root
const readRaw = () => readFileSync(join(root, 'papers/sample-a/graph.json'), 'utf8')
const read = () => JSON.parse(readRaw())

/** A stand-in for claude that replies `graph` as a fenced JSON block and logs how it was called. */
const reply = (graph, calls = []) => async (opts) => {
  calls.push(opts)
  return `Here is the graph.\n\`\`\`json\n${JSON.stringify(graph)}\n\`\`\``
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'graph-'))
  cpSync(FIXTURE, root, { recursive: true })
})

describe('graphPrompt', () => {
  it('puts block ids, the thesis and the map nodes in the prompt', () => {
    const { prompt } = graphPrompt(paper, map)
    expect(prompt).toContain('[s2-p1] ')
    expect(prompt).toContain(map.centre.hypothesis.at(-1).text)
    expect(prompt).toContain(map.centre.question.at(-1).text)
    expect(prompt).toContain('sample-b — ')
    expect(prompt).not.toContain('[refs-1]')
  })

  it('describes the contract and asks for JSON only', () => {
    const { system } = graphPrompt(paper, map)
    for (const word of ['concept', 'limitation', 'supports', 'example-of', 'thesis', 'JSON']) expect(system).toContain(word)
  })
})

describe('buildGraph', () => {
  it('re-exports the JSON reader', () => expect(extractJson('x {"a":1} y')).toEqual({ a: 1 }))

  it('writes a valid graph', async () => {
    const calls = []
    const r = await buildGraph('sample-a', { root, claude: reply(validGraph, calls), date })
    expect(r).toEqual({ ideas: 3, edges: 2, thesis: 2 })
    expect(read().built).toEqual({ date, model: 'claude-sonnet-5-5', effort: 'xhigh' })
    expect(read().ideas.every((i) => i.origin === 'read')).toBe(true)
    expect(calls[0]).toMatchObject({ model: 'claude-sonnet-5-5', effort: 'xhigh', tools: [] })
  })

  it('keeps the old graph when the reply is invalid', async () => {
    const before = readRaw()
    await expect(buildGraph('sample-a', { root, claude: reply(graphCiting('s9-p9')), date })).rejects.toThrow('block "s9-p9" is not in paper.json')
    expect(readRaw()).toBe(before)
  })

  it('drops an empty key instead of refusing the graph', async () => {
    const blankKeys = { ...validGraph, ideas: validGraph.ideas.map((i) => ({ ...i, key: i.key ?? '' })) }
    await buildGraph('sample-a', { root, claude: reply(blankKeys), date })
    expect(read().ideas.find((i) => i.id === 'i2')).not.toHaveProperty('key')
    expect(read().ideas.find((i) => i.id === 'i1').key).toBe('reachability-validator')
  })

  it('keeps an invalid reply where it can be repaired and built from without asking again', async () => {
    const error = await buildGraph('sample-a', { root, claude: reply(graphCiting('s9-p9')), date }).catch((e) => e)
    const saved = /saved in (.+\.json)/.exec(error.message)?.[1]
    expect(saved).toBeDefined()
    const repaired = JSON.parse(readFileSync(saved, 'utf8').replace('s9-p9', 's2-p1'))
    await buildGraph('sample-a', { root, claude: reply(repaired), date })
    expect(read().ideas[0].blocks).toEqual(['s2-p1'])
  })

  it('keeps the old graph when claude fails', async () => {
    const before = readRaw()
    const failing = async () => {
      throw new Error('claude: Not logged in')
    }
    await expect(buildGraph('sample-a', { root, claude: failing, date })).rejects.toThrow('Not logged in')
    expect(readRaw()).toBe(before)
  })
})
