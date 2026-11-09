import { describe, expect, it } from 'vitest'
import { loadIndex, parseDeck, slidesUsing } from '../assets/presentations.js'

const both = (en, es) => `<span lang="en">${en}</span><span lang="es">${es}</span>`
const deck = `<!doctype html><body><main class="deck">
  <section class="slide slide--title"><p class="eyebrow"><span>${both('Presentation 01', 'Presentación 01')}</span><b>01</b></p>
    <h1 data-app-name></h1><p class="lede">${both('A lede', 'Una bajada')}</p></section>
  <section class="slide slide--kpi" data-map="ifc"><h2>${both('A day.<sup>1</sup>', 'Un día.<sup>1</sup>')}</h2></section>
  <section class="slide" data-map="question  hypothesis"><blockquote>${both('How?', '¿Cómo?')}</blockquote></section>
  <section class="slide slide--shot" data-map="ifc"><div class="shot__caption"><h2>${both('Rules, <em>again.</em>', 'Reglas, <em>otra vez.</em>')}</h2></div></section>
</main></body>`

describe('parseDeck', () => {
  const { slides } = parseDeck(deck)
  it('numbers the slides from 1', () => {
    expect(slides.map((s) => s.n)).toEqual([1, 2, 3, 4])
  })
  it('takes the title in both languages: heading, quote, then lede and eyebrow when the heading is empty', () => {
    expect(slides[0].title).toEqual({ en: 'A lede', es: 'Una bajada' })
    expect(slides[2].title).toEqual({ en: 'How?', es: '¿Cómo?' })
    expect(slides[3].title).toEqual({ en: 'Rules, again.', es: 'Reglas, otra vez.' })
  })
  it('drops footnote marks from a title', () => {
    expect(slides[1].title).toEqual({ en: 'A day.', es: 'Un día.' })
  })
  it('reads data-map as a list of ids, none when absent', () => {
    expect(slides[0].map).toEqual([])
    expect(slides[2].map).toEqual(['question', 'hypothesis'])
  })
  it('falls back to "Slide n" for a slide with no text', () => {
    const { slides: s } = parseDeck('<main class="deck"><section class="slide"></section></main>')
    expect(s[0].title).toEqual({ en: 'Slide 1', es: 'Diapositiva 1' })
  })
})

describe('loadIndex', () => {
  const presentations = {
    leaders: [{ id: 'presentacion-01', date: '2026-10-21', title: { en: 'Start', es: 'Inicio' } }],
    thesis: [{ id: 'presentacion-01', title: { en: 'Start', es: 'Inicio' } }, { id: 'presentacion-02', title: { en: 'Two', es: 'Dos' } }],
  }
  const tracks = { leaders: { en: 'Gensler', es: 'Gensler' }, thesis: { en: 'IAAC', es: 'IAAC' } }
  const read = async (path) => (path === 'presentations/thesis/presentacion-02/index.html' ? null : deck)

  it('lists the tracks with their presentations and slides, in order', async () => {
    const index = await loadIndex(read, presentations, tracks)
    expect(index.tracks.map((t) => t.key)).toEqual(['leaders', 'thesis'])
    expect(index.tracks[0].name).toEqual({ en: 'Gensler', es: 'Gensler' })
    expect(index.tracks[0].items[0].slides).toHaveLength(4)
    expect(index.tracks[0].items[0].date).toBe('2026-10-21')
  })
  it('skips a presentation whose file is missing', async () => {
    const index = await loadIndex(read, presentations, tracks)
    expect(index.tracks[1].items.map((i) => i.id)).toEqual(['presentacion-01'])
  })
})

describe('slidesUsing', () => {
  it('finds the slides that cite an id, across presentations', async () => {
    const presentations = { leaders: [{ id: 'presentacion-01', title: { en: 'S', es: 'S' } }], thesis: [{ id: 'presentacion-01', title: { en: 'S', es: 'S' } }] }
    const index = await loadIndex(async () => deck, presentations, { leaders: { en: 'L', es: 'L' }, thesis: { en: 'T', es: 'T' } })
    const hits = slidesUsing(index, 'ifc')
    expect(hits.map((h) => `${h.track}:${h.n}`)).toEqual(['leaders:2', 'leaders:4', 'thesis:2', 'thesis:4'])
    expect(hits[0]).toMatchObject({ presentation: 'presentacion-01', title: { en: 'A day.', es: 'Un día.' } })
    expect(slidesUsing(index, 'nothing')).toEqual([])
  })
})
