// The structure of deck 08 (the midterm Pecha Kucha, written as a paper): what the brief fixes and the page must keep.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PHASES, PLACES } from '../../presentations/assets/pitch-building.js'
import { chaptersOf } from '../../presentations/assets/pitch.js'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'presentations', 'thesis', 'presentacion-08')
const doc = new DOMParser().parseFromString(readFileSync(join(DIR, 'index.html'), 'utf8'), 'text/html')
const slides = [...doc.querySelectorAll('main.deck section.slide')]

// the five parts of the brief, as the sections of a paper, three slides each
const CHAPTERS = [
  ['1 · Introduction', 3],
  ['2 · Research question', 3],
  ['3 · Related work', 3],
  ['4 · Method', 3],
  ['5 · Results so far', 3],
]
/** What a slide shows, without its sources, its tags and its notes. */
const spoken = (slide) => {
  const copy = slide.cloneNode(true)
  copy.querySelectorAll('.refs, .pitch__tag, aside.notes, script, style').forEach((n) => n.remove())
  return copy.textContent.replace(/\s+/g, ' ').trim()
}
/**
 * Every figure a slide may show: small integers (slide and step numbers), years, and these, each from pipeline/out/ or
 * from a paper read (Noardo 2021, Geç 2026, Tang 2024).
 */
const FIGURES = new Set([
  57, 0.926, 0.464, 0.209, // the problem
  180, 179, 83, 24, 16, 91, // the round trip and the sample's rooms
  40, 90, // Tang's sweep
  394, 1238, 403, 286, // E1
  79.4, 58.9, 61.7, 32.7, 107, 0, // E2 and E3
])
const allowed = (n) => (Number.isInteger(n) && ((n >= 1 && n <= 15) || (n >= 2021 && n <= 2026))) || FIGURES.has(n)

describe('deck 08', () => {
  it('is a pitch, in English only', () => {
    expect(doc.body.hasAttribute('data-pitch')).toBe(true)
    expect(doc.body.dataset.langOnly).toBe('en')
  })

  it('has 15 slides, in five paper sections of three', () => {
    expect(slides).toHaveLength(15)
    expect(chaptersOf(slides).map((c) => [c.name, c.count])).toEqual(CHAPTERS)
  })

  it('gives every slide a phase of the building and a place for it', () => {
    slides.forEach((s, i) => {
      expect(PHASES, `slide ${i + 1} data-phase`).toContain(s.dataset.phase)
      expect(Object.keys(PLACES), `slide ${i + 1} data-place`).toContain(s.dataset.place)
    })
  })

  it('keeps each slide to 40 words or fewer outside its sources, tags and notes', () => {
    slides.forEach((s, i) => {
      const words = spoken(s).split(' ').filter(Boolean).length
      expect(words, `slide ${i + 1} has ${words} words`).toBeLessThanOrEqual(40)
    })
  })

  it('tags every slide that draws what is not built yet', () => {
    slides.forEach((s, i) => {
      if (s.dataset.phase === 'masked' || s.querySelector('.roomgraph')) {
        expect(s.querySelector('.pitch__tag'), `slide ${i + 1} needs a .pitch__tag`).not.toBeNull()
      }
    })
  })

  it('asks the research question on rooms, word for word', () => {
    expect(spoken(slides[3])).toMatch(/Can BIM models be decomposed into rooms and their relations to generate new, valid models\?/)
  })

  it('has its two key references, each with its link', () => {
    for (const [n, doi] of [[7, '10.1109/tpami.2024.3355248'], [8, '10.1177/14780771251352946']]) {
      expect(slides[n - 1].querySelector(`.refs a[href*="${doi}"]`), `slide ${n}`).not.toBeNull()
    }
  })

  it('shows only figures from the pipeline or the papers', () => {
    slides.forEach((s, i) => {
      for (const m of spoken(s).replace(/(\d),(\d{3})/g, '$1$2').matchAll(/\d+(?:\.\d+)?/g)) {
        expect(allowed(Number.parseFloat(m[0])), `slide ${i + 1} shows ${m[0]}`).toBe(true)
      }
    })
  })

  it('never says the office models are already in hand', () => {
    expect(slides.map(spoken).join(' ')).not.toMatch(/we have \d+ models|our \d+ models|models in hand/i)
  })

  it('gives every slide speaker notes of 40 to 60 words, two to six key words marked', () => {
    slides.forEach((s, i) => {
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
