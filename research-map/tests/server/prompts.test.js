// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MODELS,
  RESEARCH_TOOLS,
  chatPrompt,
  citesOf,
  nearBlocks,
  notePrompt,
  parseStatus,
  rereadPrompt,
  splitGraphAdd,
} from '../../scripts/server/prompts.mjs'

const fixture = (p) => JSON.parse(readFileSync(join(import.meta.dirname, '..', 'fixture', p), 'utf8'))
const paper = fixture('papers/sample-a/paper.json')
const graph = fixture('papers/sample-a/graph.json')
const paperText = paper.sections[0].blocks[1].text.en // a paragraph no idea quotes

const base = {
  thesis: { question: 'Can rule sets produce training data?', hypothesis: 'Rules make the dataset.' },
  mapTitles: { 'sample-a': 'Sample A', 'sample-b': 'Sample B' },
  prepared: ['sample-a', 'sample-b'],
  underlines: [],
  attach: [],
  history: [],
  message: '¿Qué valida?',
  scope: null,
  lang: 'es',
}
const papers = [{ node: 'sample-a', title: 'Sample', graph }]

describe('the models', () => {
  it('names the models and the research tools', () => {
    expect(MODELS).toEqual({
      sonnet: { model: 'claude-sonnet-5-5', effort: 'low' },
      haiku: { model: 'claude-haiku-5-5' },
      reread: { model: 'claude-sonnet-5-5', effort: 'medium' },
    })
    expect(RESEARCH_TOOLS).toEqual(['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch'])
  })
})

describe('chatPrompt', () => {
  it('asks for the status line and puts the graph, not the text, in a question', () => {
    const { system, prompt } = chatPrompt({ mode: 'ask', papers, ...base })
    expect(system).toMatch(/first line/i)
    expect(system).toContain('NOT COVERED')
    expect(system).toContain('[¶ ')
    expect(system).toMatch(/Spanish/)
    expect(prompt).toContain(graph.ideas[0].en)
    expect(prompt).toContain('s2-p1')
    expect(prompt).toContain(base.thesis.hypothesis)
    expect(prompt).toContain('¿Qué valida?')
    expect(prompt).not.toContain(paperText)
  })

  it('includes the attached passage and the underlines word for word', () => {
    const attach = [{ block: 's2-p1', text: 'una retícula de 0.25 m' }]
    const underlines = [{ block: 's1-p1', text: 'Embodied agents need many houses' }]
    const { prompt } = chatPrompt({ mode: 'explain', papers, ...base, attach, underlines })
    expect(prompt).toContain('«una retícula de 0.25 m»')
    expect(prompt).toContain('s2-p1')
    expect(prompt).toContain('Embodied agents need many houses')
  })

  it('quiz asks for questions on the chosen scope, without answers', () => {
    const { system, prompt } = chatPrompt({ mode: 'quiz', papers, ...base, scope: { kind: 'section', ids: ['s2'] } })
    expect(system).toMatch(/open questions/i)
    expect(system).toMatch(/do not answer them|without (the )?answers/i)
    expect(prompt).toContain('s2')
  })

  it('after a quiz, the next turn asks Claude to assess the answer', () => {
    const history = [
      { role: 'user', mode: 'quiz', text: 'Hazme preguntas' },
      { role: 'assistant', mode: 'quiz', text: '1. ¿Por qué 0.25 m?' },
    ]
    const { system } = chatPrompt({ mode: 'ask', papers, ...base, history, message: 'Porque es fino' })
    expect(system).toMatch(/what was right/i)
    expect(system).toMatch(/what was missing/i)
  })

  it('research lists the other graphs and the notes, and asks for sources', () => {
    const { system, prompt } = chatPrompt({ mode: 'research', papers, ...base })
    expect(prompt).toContain('papers/sample-b/graph.json')
    expect(prompt).toContain('notes/')
    expect(system).toMatch(/sources/i)
    expect(system).not.toMatch(/first line/i)
  })

  it('keeps the conversation so far', () => {
    const history = [{ role: 'user', mode: 'ask', text: 'Primera pregunta' }, { role: 'assistant', text: 'Primera respuesta' }]
    expect(chatPrompt({ mode: 'ask', papers, ...base, history }).prompt).toContain('Primera respuesta')
  })
})

describe('the re-read', () => {
  it('gives the chosen blocks and asks for new ideas in a graph-add block', () => {
    const { system, prompt } = rereadPrompt({ paper, blockIds: ['s2-p1'], question: '¿Qué valida?', history: [], lang: 'es' })
    expect(prompt).toContain('[s2-p1] ')
    expect(prompt).not.toContain('[s1-p1] ')
    expect(system).toContain('graph-add')
    expect(system).toContain('NOT COVERED')
  })

  it('gives the whole paper but the references when no block is named', () => {
    const { prompt } = rereadPrompt({ paper, blockIds: null, question: 'x', history: [], lang: 'es' })
    expect(prompt).toContain('[s1-p1] ')
    expect(prompt).not.toContain('[refs-1]')
  })
})

describe('the protocol', () => {
  it('parses both status lines', () => {
    expect(parseStatus('COVERED')).toEqual({ covered: true, near: [] })
    expect(parseStatus('NOT COVERED: s3-p2 s4-p1')).toEqual({ covered: false, near: ['s3-p2', 's4-p1'] })
    expect(parseStatus('NOT COVERED')).toEqual({ covered: false, near: [] })
    expect(parseStatus('Hola')).toBeNull()
  })

  it('splits the graph-add block off the answer', () => {
    const text = 'Sí [¶ s2-p2].\n```graph-add\n[{"kind":"claim","en":"e","es":"e","blocks":["s2-p2"]}]\n```'
    expect(splitGraphAdd(text)).toEqual({ answer: 'Sí [¶ s2-p2].', ideas: [{ kind: 'claim', en: 'e', es: 'e', blocks: ['s2-p2'] }] })
    expect(splitGraphAdd('Solo texto')).toEqual({ answer: 'Solo texto', ideas: [] })
    expect(splitGraphAdd('A\n```graph-add\nnot json\n```').ideas).toEqual([])
  })

  it('finds cited blocks', () => expect(citesOf('a [¶ s3-p2] b [¶ fig-1] [¶ s3-p2]')).toEqual(['s3-p2', 'fig-1']))

  it('takes the blocks around the near ones', () => {
    expect(nearBlocks(paper, ['s2-p1'], 1)).toEqual(['s1-p2', 's2-p1', 'fig-1'])
    expect(nearBlocks(paper, ['s2-p2'], 3)).toEqual(['s1-p2', 's2-p1', 'fig-1', 's2-p2'])
  })
})

describe('notePrompt', () => {
  it('the note prompt keeps the author words verbatim', () => {
    const text = 'Lo entendí así: el validador es la regla, no el modelo.'
    const { system, prompt } = notePrompt({ text, from: 'author', node: 'sample-a', paperTitle: 'Sample' })
    expect(prompt).toContain(text)
    expect(system).toMatch(/English/)
    expect(system).toContain('Author:')
    expect(system).toContain('Claude:')
    expect(system).toMatch(/exactly as/i)
  })
})
