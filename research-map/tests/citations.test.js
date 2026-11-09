import { describe, expect, it } from 'vitest'
import { citationRuns, citationsIn, referencesOf, withoutCitations } from '../assets/citations.js'
import { buildQueue } from '../assets/speech.js'

const paper = (refs, body = 'Text.') => ({
  sections: [
    { id: 's1', title: { en: 'One' }, blocks: [{ id: 's1-p1', type: 'paragraph', page: 1, text: { en: body, es: body } }] },
    { id: 'refs', title: { en: 'References' }, blocks: refs.map((t, i) => ({ id: `refs-${i + 1}`, type: 'paragraph', page: 2, text: { en: t } })) },
  ],
})
const refs = referencesOf(paper(['[1] A. One.', '[2] B. Two.', '[3] C. Three.', '[9] D. Nine.']))

describe('the references of a paper', () => {
  it('reads both ways of numbering them', () => {
    expect(refs.get(9).text).toBe('D. Nine.')
    expect(referencesOf(paper(['1. Ansel, J.: Pytorch.'])).get(1)).toEqual({ id: 'refs-1', text: 'Ansel, J.: Pytorch.', url: null })
  })

  it('cuts references "1." that share one block, in sequence', () => {
    const r = referencesOf(paper(['1. Ansel, J.: Pytorch 2. In: Proc. 2. del Campo, M.: Deep. (2022) 3. W., Z.: Graphs. https://a.org/x 4. Zhou, Y.: Rooms.']))
    expect([...r.keys()]).toEqual([1, 2, 3, 4])
    expect(r.get(1).text).toBe('Ansel, J.: Pytorch 2. In: Proc.')
    expect(r.get(3)).toMatchObject({ text: 'W., Z.: Graphs. https://a.org/x', url: 'https://a.org/x' })
  })

  it('finds the link of a reference, also a DOI or one the PDF broke', () => {
    const get = (t) => referencesOf(paper([`1. ${t}`])).get(1).url
    expect(get('A. See https://arxiv.org/abs/2106.09712.')).toBe('https://arxiv.org/abs/2106.09712')
    expect(get('A. doi:10.1016/j.autcon.2023.104778.')).toBe('https://doi.org/10.1016/j.autcon.2023.104778')
    expect(get('A. https://doi.org/10. 3233/SW-200385')).toBe('https://doi.org/10.3233/SW-200385')
  })

  it('is empty for a paper whose references have no numbers', () => {
    expect(referencesOf(paper(['Ansel, J. (2019). Pytorch.'])).size).toBe(0)
  })
})

describe('citations in the text', () => {
  it('finds single, listed and ranged numbers', () => {
    expect(citationsIn('As shown [9].', refs)).toEqual([{ start: 9, end: 12, numbers: [9] }])
    expect(citationsIn('See [1, 9] and [1–3].', refs).map((c) => c.numbers)).toEqual([[1, 9], [1, 2, 3]])
  })

  it('leaves a bracket alone when a number in it is not a reference', () => {
    expect(citationsIn('Values in [0, 1] and [4].', refs)).toEqual([])
  })

  it('finds nothing in a paper without numbered references', () => {
    expect(citationsIn('As shown [9].', new Map())).toEqual([])
  })

  it('splits a bracket into its numbers and keeps every character', () => {
    const text = 'See [1, 9] now.'
    const runs = citationRuns(text, refs)
    expect(runs.map((r) => r.text).join('')).toBe(text)
    expect(runs.filter((r) => r.cite).map((r) => r.cite)).toEqual([[1], [9]])
      })
})

describe('the voice', () => {
  it('says the text without its citations', () => {
    expect(withoutCitations('As shown [1, 9], it works [2].', refs)).toBe('As shown, it works.')
    expect(withoutCitations('Values in [0, 1].', refs)).toBe('Values in [0, 1].')
  })

  it('reads the queue without citations, keeping the sentence ranges of the text', () => {
    const body = 'Graphs help [1]. They scale [2, 3].'
    const q = buildQueue(paper(['[1] A.', '[2] B.', '[3] C.'], body), 'en')
    expect(q.map((i) => i.text)).toEqual(['Graphs help.', 'They scale.'])
    expect(body.slice(q[1].start, q[1].end).trim()).toBe('They scale [2, 3].')
  })
})
