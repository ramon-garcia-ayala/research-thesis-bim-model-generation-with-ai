import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_MS, latestPresentation, mountDeck, neighborPresentation, openLatest, slideFromHash, watchIdle } from '../../presentations/assets/deck.js'
import { APP_NAME } from '../../presentations/assets/site.js'

const presentations = [
  { id: 'presentacion-01', date: '2026-10-21', title: { en: 'Start', es: 'Inicio' } },
  { id: 'presentacion-02', date: '2026-10-28', title: { en: 'Two', es: 'Dos' } },
  { id: 'presentacion-03', title: { en: 'Three', es: 'Tres' } },
]

describe('slideFromHash', () => {
  it('reads a 1-based hash as a 0-based index', () => {
    expect(slideFromHash('#1', 5)).toBe(0)
    expect(slideFromHash('#5', 5)).toBe(4)
  })
  it('clamps out-of-range hashes to the deck', () => {
    expect(slideFromHash('#99', 5)).toBe(4)
    expect(slideFromHash('#0', 5)).toBe(0)
  })
  it('opens the first slide for anything unparsable', () => {
    expect(slideFromHash('#abc', 5)).toBe(0)
    expect(slideFromHash('', 5)).toBe(0)
  })
})

describe('presentations', () => {
  it('finds the neighbours of a presentation', () => {
    expect(neighborPresentation(presentations, 'presentacion-02', -1).id).toBe('presentacion-01')
    expect(neighborPresentation(presentations, 'presentacion-02', 1).id).toBe('presentacion-03')
  })
  it('has no neighbour past either end', () => {
    expect(neighborPresentation(presentations, 'presentacion-01', -1)).toBeNull()
    expect(neighborPresentation(presentations, 'presentacion-03', 1)).toBeNull()
  })
  it('the latest presentation is the last one, none when empty', () => {
    expect(latestPresentation(presentations).id).toBe('presentacion-03')
    expect(latestPresentation([])).toBeNull()
  })
})

describe('openLatest', () => {
  it('opens the latest presentation of the track', () => {
    const win = { location: { replace: vi.fn() } }
    openLatest(win, 'leaders', presentations)
    expect(win.location.replace).toHaveBeenCalledWith('./presentacion-03/')
  })
})

describe('mountDeck', () => {
  beforeEach(() => {
    window.location.hash = ''
    document.body.dataset.track = 'thesis'
    document.body.dataset.presentation = 'presentacion-02'
    document.body.innerHTML = `
      <nav class="rail"></nav>
      <main class="deck">
        <section class="slide"><h1><span data-app-name></span></h1></section>
        <section class="slide">two</section>
        <section class="slide">three</section>
      </main>`
    mountDeck(window, { presentations })
  })

  const shown = () => [...document.querySelectorAll('section.slide')].filter((s) => !s.hidden)

  it('shows only the first slide', () => {
    expect(shown()).toHaveLength(1)
    expect(shown()[0].textContent).not.toContain('two')
  })
  it('the right arrow moves to the next slide and the hash follows', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(shown()[0].textContent).toBe('two')
    expect(window.location.hash).toBe('#2')
  })
  it('the left arrow on the first slide stays there', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(window.location.hash).toBe('#1')
  })
  it('puts the slides on a stage, the container their sizes are measured against', () => {
    const stage = document.querySelector('main.deck > .stage')
    expect(stage).not.toBeNull()
    expect(stage.querySelectorAll('section.slide')).toHaveLength(3)
  })
  it('numbers every slide for its folio, hidden ones included', () => {
    const folios = [...document.querySelectorAll('section.slide')].map((s) => s.dataset.folio)
    expect(folios).toEqual(['01', '02', '03'])
  })
  it('fills the app name from the one constant', () => {
    expect(document.querySelector('[data-app-name]').textContent).toBe(APP_NAME)
  })
  it('the rail links every presentation of the track and marks the current one', () => {
    const links = document.querySelectorAll('nav.rail a.rail__item')
    expect(links).toHaveLength(3)
    expect(links[1].getAttribute('aria-current')).toBe('page')
    expect(links[0].getAttribute('href')).toBe('../presentacion-01/')
  })
  it('the rail home goes back to the landing of the whole site, two levels up, and names the track', () => {
    const home = document.querySelector('nav.rail a.rail__home')
    expect(home.getAttribute('href')).toBe('../../')
    expect(home.textContent).toContain('Thesis')
  })
  it('a presentation without a date shows none', () => {
    const last = document.querySelectorAll('nav.rail a.rail__item')[2]
    expect(last.querySelector('.rail__date')).toBeNull()
  })
  it('has a theme toggle that switches light and dark', () => {
    const toggle = document.querySelector('[data-theme-toggle]')
    expect(toggle).not.toBeNull()
    toggle.click()
    const first = document.documentElement.dataset.theme
    toggle.click()
    expect(document.documentElement.dataset.theme).not.toBe(first)
  })
  it('has a language toggle that switches the document language', () => {
    const toggle = document.querySelector('[data-lang-toggle]')
    const before = document.documentElement.dataset.lang
    toggle.click()
    expect(document.documentElement.dataset.lang).not.toBe(before)
  })
})

describe('watchIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    delete document.body.dataset.idle
  })
  afterEach(() => vi.useRealTimers())

  it('a show started without moving the pointer goes idle', () => {
    watchIdle(window, document)
    expect(document.body.dataset.idle).toBeUndefined()
    vi.advanceTimersByTime(IDLE_MS)
    expect(document.body.dataset.idle).toBe('')
  })

  it('moving the pointer brings the controls back, and they hide again after a while', () => {
    watchIdle(window, document)
    vi.advanceTimersByTime(IDLE_MS)
    document.dispatchEvent(new MouseEvent('mousemove'))
    expect(document.body.dataset.idle).toBeUndefined()
    vi.advanceTimersByTime(IDLE_MS - 1)
    expect(document.body.dataset.idle).toBeUndefined()
    vi.advanceTimersByTime(1)
    expect(document.body.dataset.idle).toBe('')
  })

  it('changing slides with the keys keeps them hidden', () => {
    watchIdle(window, document)
    vi.advanceTimersByTime(IDLE_MS)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.body.dataset.idle).toBe('')
  })
})
