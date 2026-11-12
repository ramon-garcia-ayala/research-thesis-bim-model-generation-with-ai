// The structure of deck 06 (the Pecha Kucha pitch): what the spec fixes and the page must keep, whatever its copy.
import { existsSync, readFileSync } from 'node:fs'
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

  it('names whose "usable" it is on slide 1 and who asked whom', () => {
    const text = spoken(slides[0])
    expect(text).toMatch(/usable for its graph/)
    expect(text).toMatch(/148 offices asked/)
  })

  it("says on slides 4 and 14 that the building is Autodesk's sample project", () => {
    for (const n of [4, 14]) {
      const tag = [...slides[n - 1].querySelectorAll('.pitch__tag')].map((x) => x.textContent).join(' ')
      expect(tag, `slide ${n}`).toMatch(/Autodesk/)
    }
  })

  it('stops the motion of pseudo-elements too: paused, ready, embedded and reduced motion', () => {
    const css = readFileSync(join(DIR, '..', '..', 'assets', 'deck.css'), 'utf8').replace(/\r\n/g, '\n')
    const rules = [
      /body\[data-pitch-state='paused'\] \.slide \*::after/,
      /body\[data-pitch-state='ready'\] \.slide \*::after/,
      /html\[data-embed\] \.slide--pitch \*::after/,
      /prefers-reduced-motion: reduce\)[^}]*\{[^}]*\.slide--pitch \*::after/,
    ]
    for (const r of rules) expect(css).toMatch(r)
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

describe('the rehearsal script (script.md)', () => {
  const path = join(DIR, 'script.md')
  const text = existsSync(path) ? readFileSync(path, 'utf8') : ''
  // a section per slide: "## 3 · The question", its spoken text until the next heading
  const sections = text.split(/^## /m).slice(1).map((s) => {
    const [head, ...body] = s.split('\n')
    return { head, body: body.join('\n').trim() }
  })
  const words = (s) => s.replace(/\*\*/g, '').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length

  it('has one section per slide, in order', () => {
    expect(sections.map((s) => Number.parseInt(s.head, 10))).toEqual(Array.from({ length: 15 }, (_, i) => i + 1))
  })

  it('gives each slide 40 to 60 spoken words, about 20 seconds', () => {
    sections.forEach((s) => {
      const n = words(s.body)
      expect(n, `section ${s.head} has ${n} words`).toBeGreaterThanOrEqual(40)
      expect(n, `section ${s.head} has ${n} words`).toBeLessThanOrEqual(60)
    })
  })

  it('marks the key words to read at a glance, two to six per slide', () => {
    sections.forEach((s) => {
      const marks = (s.body.match(/\*\*[^*]+\*\*/g) ?? []).length
      expect(marks, `section ${s.head} marks ${marks}`).toBeGreaterThanOrEqual(2)
      expect(marks, `section ${s.head} marks ${marks}`).toBeLessThanOrEqual(6)
    })
  })

  it('carries the two caveats of the hook', () => {
    expect(sections[0]?.body).toMatch(/six-class filter/)
    expect(sections[0]?.body).toMatch(/one project/)
  })

  it('never says the 10 models exist', () => {
    expect(text).not.toMatch(/we have 10|our 10|10 models in hand|I have (10|ten) models/i)
  })
})
