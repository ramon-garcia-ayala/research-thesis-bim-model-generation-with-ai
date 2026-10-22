import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { extractJson } from '../../scripts/lib/json.mjs'
import { numbersOf, sameNumbers } from '../../scripts/papers/numbers.mjs'
import { applyTranslation, batches, translate, translatePrompt, untranslated } from '../../scripts/papers/translate.mjs'

const FIXTURE = join(import.meta.dirname, '..', 'fixture')
let root
const file = () => join(root, 'papers/sample-a/paper.json')
const read = () => JSON.parse(readFileSync(file(), 'utf8'))

/** The fixture paper with no Spanish at all. */
const english = () => {
  const p = JSON.parse(readFileSync(join(FIXTURE, 'papers/sample-a/paper.json'), 'utf8'))
  for (const s of p.sections) {
    delete s.title.es
    for (const b of s.blocks) delete b.text.es
  }
  return p
}

/** A stand-in for claude: "ES " + the English of every item asked, except the given replies; logs each call's items. */
const fakeTranslator = (replies = {}, calls = []) => async ({ prompt, model, effort, tools }) => {
  const items = JSON.parse(prompt.slice(prompt.indexOf('{')))
  calls.push({ ids: Object.keys(items), model, effort, tools })
  const out = Object.fromEntries(Object.entries(items).map(([id, en]) => [id, replies[id] ?? `ES ${en}`]))
  return '```json\n' + JSON.stringify(out) + '\n```'
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'translate-'))
  cpSync(FIXTURE, root, { recursive: true })
  writeFileSync(file(), JSON.stringify(english()))
})

describe('numbers', () => {
  it('reads numbers without their thousands separators', () =>
    expect(numbersOf('17,000 plans, 17 000 rooms, 0.25 m, 31.4%, [63]')).toEqual(['17000', '17000', '0.25', '31.4', '63']))
  it('compares numbers across languages', () => {
    expect(sameNumbers('17,000 plans, 0.25 m, 31.4%', '17 000 planos, 0.25 m, 31.4 %')).toBe(true)
    expect(sameNumbers('5 positions', '6 posiciones')).toBe(false)
    expect(sameNumbers('5 positions', 'cinco posiciones')).toBe(false)
  })
})

describe('the JSON in a reply', () => {
  it('ignores anything around the JSON object', () => expect(extractJson('Here:\n```json\n{"a": "{b}"}\n```\nDone.')).toEqual({ a: '{b}' }))
  it('says when there is none', () => expect(() => extractJson('no idea')).toThrow('no JSON object in the reply'))
})

describe('batches', () => {
  it('batches by section and skips the references', () => {
    const ids = batches(english(), 2500).flatMap((b) => b.items.map((i) => i.id))
    expect(ids).toEqual(['s1#title', 's1-p1', 's1-p2', 's2#title', 's2-p1', 'fig-1', 's2-p2'])
  })
  it('keeps each section whole when it fits', () =>
    expect(batches(english(), 60).map((b) => b.items.map((i) => i.id))).toEqual([['s1#title', 's1-p1', 's1-p2'], ['s2#title', 's2-p1', 'fig-1', 's2-p2']]))
  it('leaves out what is already in Spanish', () =>
    expect(batches(applyTranslation(english(), { 's1-p1': 'Hola.' }), 2500)[0].items.map((i) => i.id)).not.toContain('s1-p1'))
  it('states the rules and asks for JSON only', () => {
    const { system, prompt } = translatePrompt([{ id: 's1-p1', text: 'Houses.' }])
    expect(system).toMatch(/numbers/i)
    expect(system).toMatch(/JSON/)
    expect(JSON.parse(prompt.slice(prompt.indexOf('{')))).toEqual({ 's1-p1': 'Houses.' })
  })
})

describe('translate', () => {
  it('fills es and leaves a mismatched block untranslated', async () => {
    const calls = []
    const r = await translate('sample-a', { root, claude: fakeTranslator({ 's2-p1': 'Cinco posiciones' }, calls) })
    expect(r.mismatched).toEqual(['s2-p1'])
    expect(read().sections[1].blocks.find((b) => b.id === 's2-p2').text.es).toBeDefined()
    expect(read().sections[1].blocks.find((b) => b.id === 's2-p1').text.es).toBeUndefined()
    expect(calls.at(-1).ids).toEqual(['s2-p1']) // retried once, on its own
    expect(calls[0]).toMatchObject({ model: 'claude-sonnet-5-5', effort: 'medium', tools: [] })
    expect(untranslated(read())).toEqual(['s2-p1'])
  })

  it('updates the index once everything is in Spanish', async () => {
    await translate('sample-a', { root, claude: fakeTranslator() })
    expect(JSON.parse(readFileSync(join(root, 'papers/index.json'), 'utf8')).papers[0].es).toBe(true)
  })

  it('keeps what was translated before a failure', async () => {
    let n = 0
    const flaky = async (opts) => {
      if (n++ === 1) throw new Error('claude: rate limit')
      return fakeTranslator()(opts)
    }
    await expect(translate('sample-a', { root, claude: flaky, maxWords: 30 })).rejects.toThrow('rate limit')
    expect(read().sections[0].blocks[0].text.es).toBe('ES Embodied agents need many houses to learn from. We generate them from rules.')
  })
})
