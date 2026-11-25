// Deck 09: deck 08's midterm pitch in the look of deck 07 (<body data-pitch data-look="deck">). What it must keep.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { chaptersOf } from '../../presentations/assets/pitch.js'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'presentations', 'thesis', 'presentacion-09')
const doc = new DOMParser().parseFromString(readFileSync(join(DIR, 'index.html'), 'utf8'), 'text/html')
const slides = [...doc.querySelectorAll('main.deck section.slide')]

const CHAPTERS = [
  ['1 · Introduction', 3],
  ['2 · Research question', 3],
  ['3 · Related work', 3],
  ['4 · Method', 3],
  ['5 · Results so far', 3],
  ['Thanks', 1],
]
/** What a slide shows, without its sources, footnotes and notes. */
const shown = (slide) => {
  const copy = slide.cloneNode(true)
  // the tokens are quoted as tokens.jsonl writes them (X:45, 0915 x 2134mm): data shown, not figures claimed
  copy.querySelectorAll('.refs, .footnote, .eyebrow, .tokrow code, aside.notes, script, style').forEach((n) => n.remove())
  // each element's text apart, so the bars' figures (<b>79.4</b><b>58.9</b>) do not run into one number
  copy.querySelectorAll('*').forEach((n) => n.append(' '))
  return copy.textContent.replace(/\s+/g, ' ').trim()
}
/** Every figure a slide may show, each from pipeline/out/ or from a paper read (Noardo 2021, Geç 2026, Tang 2024). */
const FIGURES = new Set([
  57, 0.926, 0.464, 0.209, // the problem
  180, 179, 83, 24, 16, // the round trip
  40, 90, // Tang's sweep
  394, 1238, 403, 286, 20, // E1
  79.4, 58.9, 57.9, 61.7, 29.9, 32.7, 3.36, 3.23, 107, 0, // E2 and E3
  29, // openings within 10 cm of one on a training storey
  50, 12, 39, 6, 101, // E3 · AI: how right each placed opening is
  0.5, 22.5, 23, 44, 45, 7, 14, // the tokens shown: cells, the door's X and Y, the room's
])
const allowed = (n) => (Number.isInteger(n) && ((n >= 1 && n <= 15) || (n >= 2021 && n <= 2026))) || FIGURES.has(n)

describe('deck 09', () => {
  it('is a pitch in the weekly look, in English only', () => {
    expect(doc.body.hasAttribute('data-pitch')).toBe(true)
    expect(doc.body.dataset.look).toBe('deck')
    expect(doc.body.dataset.langOnly).toBe('en')
  })

  it('has 15 slides in five paper sections of three, and a thanks after them, with no chapter covers', () => {
    expect(slides).toHaveLength(16)
    expect(chaptersOf(slides).map((c) => [c.name, c.count])).toEqual(CHAPTERS)
    expect(doc.querySelector('.slide--chapter')).toBeNull()
  })

  it('has no builds: the pitch times the slides, so every piece comes in by itself', () => {
    expect(doc.querySelector('[data-build], [data-build-state]')).toBeNull()
  })

  it('times the steps of every 3D view along the slide, since no build moves them', () => {
    for (const v of doc.querySelectorAll('.model3d')) expect(v.dataset.stepsAt, v.dataset.set).toMatch(/^\d+(\.\d+)?(,\d+(\.\d+)?)*$/)
  })

  it('marks the results as prior work at the element level, before the room', () => {
    for (const n of [13, 14]) {
      const s = slides[n - 1]
      expect(s.querySelector('.ladder [data-state="here"]')?.textContent, `slide ${n}`).toBe('element')
      expect(s.querySelector('.ladder [data-state="target"]')?.textContent, `slide ${n}`).toBe('room')
    }
    expect(slides[12].querySelector('.eyebrow').textContent).toMatch(/Prior work, element level/)
  })

  it('compares E2 with the same three bars as deck 07, and names the flaw of the storeys', () => {
    expect(slides[13].querySelectorAll('.bars__set > i.is-ai')).toHaveLength(2)
    expect(slides[13].querySelector('.model3d').dataset.set).toBe('e3_transformer')
    expect(slides[13].querySelector('.bars__key').textContent).toMatch(/copy another floor/)
    expect(shown(slides[14])).toMatch(/storeys repeat/)
    expect(shown(slides[14])).toMatch(/Real projects/)
  })

  it('asks the research question on rooms, word for word', () => {
    expect(shown(slides[3])).toMatch(/Can BIM models be decomposed into rooms and their relations to generate new, valid models\?/)
  })

  it('shows only figures from the pipeline or the papers', () => {
    slides.forEach((s, i) => {
      for (const m of shown(s).replace(/(\d),(\d{3})/g, '$1$2').matchAll(/\d+(?:\.\d+)?/g)) {
        expect(allowed(Number.parseFloat(m[0])), `slide ${i + 1} shows ${m[0]}`).toBe(true)
      }
    })
  })

  it('gives every slide speaker notes of 40 to 60 words, two to six key words marked; the thanks, shorter', () => {
    expect(slides[15].querySelector('aside.notes mark.kw')).not.toBeNull()
    slides.slice(0, 15).forEach((s, i) => {
      const notes = s.querySelector('aside.notes')
      expect(notes, `slide ${i + 1} notes`).not.toBeNull()
      const words = notes.textContent.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
      expect(words, `slide ${i + 1} notes have ${words} words`).toBeGreaterThanOrEqual(40)
      expect(words, `slide ${i + 1} notes have ${words} words`).toBeLessThanOrEqual(60)
      const marks = notes.querySelectorAll('mark.kw').length
      expect(marks, `slide ${i + 1} marks ${marks}`).toBeGreaterThanOrEqual(2)
      expect(marks, `slide ${i + 1} marks ${marks}`).toBeLessThanOrEqual(6)
    })
  })
})
