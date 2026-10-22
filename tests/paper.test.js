import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { blocksOf, mergeIdeas, paraLabel, sentences, textOf, validateGraph, validatePaper } from '../assets/paper.js'

const fixture = (name) => JSON.parse(readFileSync(join(import.meta.dirname, 'fixture/papers/sample-a', name), 'utf8'))
const paper = fixture('paper.json')
const graph = fixture('graph.json')
const ids = new Set(['sample-b'])

/** A copy of the paper with block `id` changed by `f`. */
const editBlock = (p, id, f) => {
  const q = structuredClone(p)
  for (const s of q.sections) s.blocks = s.blocks.map((b) => (b.id === id ? f(b) : b))
  return q
}
const dup = (p, id) => {
  const q = structuredClone(p)
  const s = q.sections.find((s) => s.blocks.some((b) => b.id === id))
  s.blocks.push(structuredClone(s.blocks.find((b) => b.id === id)))
  return q
}
const noImage = (p, id) => editBlock(p, id, ({ image, ...b }) => b)
const withType = (p, id, type) => editBlock(p, id, (b) => ({ ...b, type }))
const cites = (g, id, blocks) => ({ ...g, ideas: g.ideas.map((i) => (i.id === id ? { ...i, blocks } : i)) })
const thesisTo = (g, to) => ({ ...g, thesis: [{ idea: 'i1', to, why: 'x' }] })

describe('validatePaper', () => {
  it('accepts the fixture paper', () => expect(validatePaper(paper, 'sample-a')).toEqual([]))
  it('names a duplicate block id', () => expect(validatePaper(dup(paper, 's2-p1'), 'sample-a')).toContain('block "s2-p1": duplicate id'))
  it('names a figure without image', () =>
    expect(validatePaper(noImage(paper, 'fig-1'), 'sample-a')).toContain('block "fig-1": a figure needs an image'))
  it('names a node mismatch', () => expect(validatePaper(paper, 'other')).toContain('paper.json is for "sample-a", not "other"'))
  it('names an unknown block type', () =>
    expect(validatePaper(withType(paper, 's2-p1', 'poem'), 'sample-a')).toContain(
      'block "s2-p1": type "poem" is not one of heading, paragraph, figure, table, equation',
    ))
})

describe('validateGraph', () => {
  it('accepts the fixture graph', () => expect(validateGraph(graph, paper, new Set(['sample-b']))).toEqual([]))
  it('names an idea citing a missing block', () =>
    expect(validateGraph(cites(graph, 'i1', ['s9-p9']), paper, ids)).toContain('idea "i1": block "s9-p9" is not in paper.json'))
  it('names a thesis link to an unknown map id', () =>
    expect(validateGraph(thesisTo(graph, 'nope'), paper, ids)).toContain('thesis "i1" → "nope": not question, hypothesis or a map node'))
})

describe('reading helpers', () => {
  it('lists blocks in document order with their section', () =>
    expect(blocksOf(paper).map((b) => `${b.section}/${b.id}`)).toEqual(['s1/s1-p1', 's1/s1-p2', 's2/s2-p1', 's2/fig-1', 's2/s2-p2', 'refs/refs-1']))
  it('labels paragraphs and figures', () => {
    expect(paraLabel(paper, 's2-p2')).toBe('2.2')
    expect(paraLabel(paper, 'fig-1')).toBe('Fig. 1')
  })
  it('falls back to English', () => expect(textOf({ text: { en: 'Hi' } }, 'es')).toBe('Hi'))
  it('reads a section title too', () => expect(textOf({ title: { en: 'Method', es: 'Método' } }, 'es')).toBe('Método'))
  it('splits sentences without breaking abbreviations or decimals', () => {
    const t = 'A grid of 0.25 m is used, e.g. in Fig. 3. Deitke et al. report 31.4%. ¿Funciona? Sí.'
    expect(sentences(t).map(({ start, end }) => t.slice(start, end).trim())).toEqual([
      'A grid of 0.25 m is used, e.g. in Fig. 3.',
      'Deitke et al. report 31.4%.',
      '¿Funciona?',
      'Sí.',
    ])
  })
  it('merges new ideas after the existing ones', () => {
    const g = mergeIdeas(graph, [{ kind: 'claim', en: 'x', es: 'x', blocks: ['s2-p1'] }], '2026-10-23')
    expect(g.ideas.at(-1)).toMatchObject({ id: `i${graph.ideas.length + 1}`, origin: 'question', date: '2026-10-23' })
    expect(graph.ideas.length).toBe(g.ideas.length - 1)
  })
})
