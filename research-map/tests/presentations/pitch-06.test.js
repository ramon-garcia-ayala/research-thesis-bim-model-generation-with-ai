// The structure of deck 06 (the Pecha Kucha pitch): what the spec fixes and the page must keep, whatever its copy.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { chaptersOf } from '../../presentations/assets/pitch.js'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'presentations', 'thesis', 'presentacion-06')
const doc = new DOMParser().parseFromString(readFileSync(join(DIR, 'index.html'), 'utf8'), 'text/html')
const slides = [...doc.querySelectorAll('main.deck section.slide')]

const PHASES = ['off', 'exploded', 'graph', 'masked', 'rebuilt', 'motif']
const PLACES = ['right', 'left', 'full', 'corner']
const CHAPTERS = [
  ['Topic & context', 3],
  ['Innovation', 3],
  ['Actors', 1],
  ['Exploit', 3],
  ['Impact', 3],
  ['Readiness & next', 2],
]
/** What a slide shows, without its sources and its tags. */
const spoken = (slide) => {
  const copy = slide.cloneNode(true)
  copy.querySelectorAll('.refs, .pitch__tag, script, style').forEach((n) => n.remove())
  return copy.textContent.replace(/\s+/g, ' ').trim()
}
/** Every figure the spec allows on a slide: small integers (slide and step numbers), years, and these. */
const FIGURES = new Set([57, 50, 148, 22, 0.926, 0.464, 0.209, 99, 81, 90, 180, 179, 83, 24, 16, 86, 91, 0.87, 0.5, 30, 9, 10])
const allowed = (n) => (Number.isInteger(n) && ((n >= 1 && n <= 15) || (n >= 2021 && n <= 2026))) || FIGURES.has(n)

describe('deck 06', () => {
  it('is a pitch, in English only', () => {
    expect(doc.body.hasAttribute('data-pitch')).toBe(true)
    expect(doc.body.dataset.langOnly).toBe('en')
  })

  it('has 15 slides', () => {
    expect(slides).toHaveLength(15)
  })

  it('has its chapters in order, contiguous, sized 3 · 3 · 1 · 3 · 3 · 2', () => {
    const found = chaptersOf(slides).map((c) => [c.name, c.count])
    expect(found).toEqual(CHAPTERS)
  })

  it('gives every slide a phase of the building and a place for it', () => {
    slides.forEach((s, i) => {
      expect(PHASES, `slide ${i + 1} data-phase`).toContain(s.dataset.phase)
      expect(PLACES, `slide ${i + 1} data-place`).toContain(s.dataset.place)
    })
  })

  it('keeps each slide to 40 words or fewer outside its sources and tags', () => {
    slides.forEach((s, i) => {
      const words = spoken(s).split(' ').filter(Boolean).length
      expect(words, `slide ${i + 1} has ${words} words`).toBeLessThanOrEqual(40)
    })
  })

  it('tags every masked or rebuilt slide, because what it draws is not built yet', () => {
    slides.forEach((s, i) => {
      if (['masked', 'rebuilt'].includes(s.dataset.phase)) {
        expect(s.querySelector('.pitch__tag'), `slide ${i + 1} needs a .pitch__tag`).not.toBeNull()
      }
    })
  })

  it('never says the 10 models exist', () => {
    expect(slides.map(spoken).join(' ')).not.toMatch(/we have 10|our 10|10 models in hand|I have 10/i)
  })

  it('shows only figures the spec allows', () => {
    slides.forEach((s, i) => {
      for (const m of spoken(s).matchAll(/\d+(?:\.\d+)?/g)) {
        expect(allowed(Number.parseFloat(m[0])), `slide ${i + 1} shows ${m[0]}`).toBe(true)
      }
    })
  })
})
