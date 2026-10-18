import { describe, expect, it } from 'vitest'
import { isNew, linkKey, validate } from '../assets/model.js'

const base = () => ({
  version: 1,
  lastPresentation: null,
  centre: {
    question: [{ date: '2026-10-18', text: 'How?' }],
    hypothesis: [{ date: '2026-10-18', text: 'Rules can.' }],
  },
  groups: [{ id: 'datasets', title: 'Datasets', colour: 'g1', date: '2026-10-18' }],
  nodes: [{ id: 'procthor', kind: 'paper', group: 'datasets', title: 'ProcTHOR', date: '2026-10-18' }],
  links: [{ from: 'procthor', to: 'hypothesis', date: '2026-10-18', explanation: 'Supports it.' }],
})

describe('validate', () => {
  it('a valid map has no problems; an empty one neither', () => {
    expect(validate(base())).toEqual([])
    expect(validate({ version: 1, lastPresentation: null, centre: { question: [], hypothesis: [] }, groups: [], nodes: [], links: [] })).toEqual([])
  })

  it('names the item for each kind of problem', () => {
    const cases = [
      [(m) => (m.nodes[0].group = 'ml'), /procthor.*group "ml"/],
      [(m) => (m.links[0].to = 'nowhere'), /procthor→nowhere.*"nowhere"/],
      [(m) => (m.links[0].explanation = '  '), /procthor→hypothesis.*explanation/],
      [(m) => m.nodes.push({ ...m.nodes[0] }), /duplicate id "procthor"/],
      [(m) => (m.groups[0].id = 'procthor'), /duplicate id "procthor"/],
      [(m) => (m.nodes[0].date = '2026-13-01'), /procthor.*date/],
      [(m) => (m.nodes[0].date = '18/10/2026'), /procthor.*date/],
      [(m) => (m.nodes[0].kind = 'video'), /procthor.*kind "video"/],
      [(m) => (m.groups[0].colour = 'red'), /datasets.*colour "red"/],
      [(m) => (m.nodes[0].id = 'question'), /reserved/],
      [(m) => (m.nodes[0].title = ''), /procthor.*title/],
      [(m) => (m.centre.question[0].date = 'today'), /question.*date/],
      [(m) => (m.centre.hypothesis[0].text = ''), /hypothesis.*text/],
      [(m) => (m.lastPresentation = '2026-W43'), /lastPresentation/],
      [(m) => (m.nodes[0].source = { original: 'I:\\x.pdf' }), /procthor.*source/],
      [(m) => (m.nodes[0].id = 'Pro Thor'), /id "Pro Thor"/],
    ]
    for (const [break_, message] of cases) {
      const m = base()
      break_(m)
      const problems = validate(m)
      expect(problems.join('\n'), String(message)).toMatch(message)
    }
  })

  it('a malformed file is one problem, not a crash', () => {
    expect(validate(null)).toHaveLength(1)
    expect(validate({ version: 1 }).length).toBeGreaterThan(0)
  })
})

describe('isNew', () => {
  it('with no presentation yet, everything is new', () => {
    const n = isNew(base(), {})
    expect([...n].sort()).toEqual(['datasets', 'hypothesis', 'procthor', 'procthor→hypothesis', 'question'].sort())
  })

  it('after a presentation, only what was approved later', () => {
    const m = base()
    m.lastPresentation = '2026-10-21'
    m.nodes.push({ id: 'atlas', kind: 'paper', group: 'datasets', title: 'Atlas', date: '2026-10-22' })
    m.links.push({ from: 'atlas', to: 'procthor', date: '2026-10-22', explanation: 'Extends it.' })
    m.centre.question.push({ date: '2026-10-25', text: 'How, better?' })
    expect([...isNew(m, {})].sort()).toEqual(['atlas', 'atlas→procthor', 'question'].sort())
  })

  it('the day of the presentation itself is not new', () => {
    const m = base()
    m.lastPresentation = '2026-10-18'
    expect(isNew(m, {}).size).toBe(0)
  })

  it('a node whose only new thing is a note entry is new', () => {
    const m = base()
    m.lastPresentation = '2026-10-21'
    const notes = { procthor: [{ date: '2026-10-18', kind: 'Summary', body: '' }, { date: '2026-10-23', kind: 'Result', body: '' }] }
    expect([...isNew(m, notes)]).toEqual(['procthor'])
  })

  it('a link key reads from→to', () => {
    expect(linkKey({ from: 'a', to: 'b' })).toBe('a→b')
  })
})
