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
    expect(home.textContent).toContain('IAAC')
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

describe('embed (the deck inside the map\'s viewer)', () => {
  const posted = []
  beforeEach(() => {
    posted.length = 0
    vi.spyOn(window.parent, 'postMessage').mockImplementation((data) => { posted.push(data) })
    window.history.replaceState(null, '', '/?embed')
    delete document.documentElement.dataset.embed
    document.body.dataset.track = 'leaders'
    document.body.dataset.presentation = 'presentacion-01'
    document.body.innerHTML = `
      <nav class="rail"></nav>
      <main class="deck">
        <section class="slide" data-map="question hypothesis">one</section>
        <section class="slide">two</section>
        <section class="slide" data-map="ifc">three</section>
      </main>`
    mountDeck(window, { presentations })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    window.history.replaceState(null, '', '/')
  })

  const message = (data, origin = window.location.origin) =>
    window.dispatchEvent(new MessageEvent('message', { data, origin, source: window }))
  const shown = () => [...document.querySelectorAll('section.slide')].findIndex((s) => !s.hidden)

  it('marks the page as embedded', () => {
    expect(document.documentElement.dataset.embed).toBe('')
  })
  it('tells the parent the slide and the map ids it uses, on mount and on every change', () => {
    expect(posted.at(-1)).toEqual({ type: 'slide', track: 'leaders', presentation: 'presentacion-01', index: 0, total: 3, map: ['question', 'hypothesis'] })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(posted.at(-1)).toMatchObject({ index: 1, map: [] })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(posted.at(-1)).toMatchObject({ index: 2, map: ['ifc'] })
  })
  it('goes to the slide the parent asks for', () => {
    message({ type: 'goto', index: 2 })
    expect(shown()).toBe(2)
  })
  it('ignores a message from another origin', () => {
    message({ type: 'goto', index: 2 }, 'https://evil.example')
    expect(shown()).toBe(0)
  })
  it('switches language when the parent asks', () => {
    const other = document.documentElement.dataset.lang === 'es' ? 'en' : 'es'
    message({ type: 'lang', lang: other })
    expect(document.documentElement.dataset.lang).toBe(other)
  })
})

describe('clips (looping videos on a slide)', () => {
  let video
  let play
  let pause
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    document.body.dataset.track = 'leaders'
    document.body.dataset.presentation = 'presentacion-01'
    document.body.innerHTML = `
      <nav class="rail"></nav>
      <main class="deck">
        <section class="slide">one</section>
        <section class="slide"><video muted loop></video></section>
      </main>`
    // stubs on this deck's own video: decks mounted by earlier tests keep listening on the document
    video = document.querySelector('video')
    play = vi.fn(() => Promise.resolve())
    pause = vi.fn()
    video.play = play
    video.pause = pause
    mountDeck(window, { presentations })
  })
  const key = (k) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k }))

  it('does not play a clip on a slide that is not shown', () => {
    expect(play).not.toHaveBeenCalled()
    expect(pause).toHaveBeenCalled()
  })
  it('plays the clip when its slide comes up and pauses it when the slide goes', () => {
    key('ArrowRight')
    expect(play).toHaveBeenCalledTimes(1)
    pause.mockClear()
    key('ArrowLeft')
    expect(pause).toHaveBeenCalled()
  })
  it('a play() the browser refuses is not an error', () => {
    play.mockImplementation(() => Promise.reject(new DOMException('interrupted', 'AbortError')))
    expect(() => key('ArrowRight')).not.toThrow()
  })
})

describe('builds (a slide revealed one click at a time)', () => {
  let slides
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    document.body.dataset.track = 'leaders'
    document.body.dataset.presentation = 'presentacion-01'
    document.body.innerHTML = `
      <nav class="rail"></nav>
      <main class="deck">
        <section class="slide">one</section>
        <section class="slide">
          <p class="a" data-build="1">a</p><p class="b" data-build="1">b</p>
          <li class="s" data-build-state="2">state</li>
          <p class="c" data-build="3">c</p>
        </section>
        <section class="slide">three</section>
      </main>`
    mountDeck(window, { presentations })
    slides = [...document.querySelectorAll('section.slide')]
  })
  const key = (k) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k }))
  const shown = () => slides.findIndex((s) => !s.hidden)
  const $ = (sel) => slides[1].querySelector(sel)

  it('a slide without builds is complete from the start', () => {
    expect(slides[0].dataset.step).toBe('0')
    expect(slides[0].dataset.complete).toBe('')
  })
  it('a slide with builds comes in at step 0, nothing built yet', () => {
    key('ArrowRight')
    expect(shown()).toBe(1)
    expect(slides[1].dataset.step).toBe('0')
    expect(slides[1].dataset.complete).toBeUndefined()
    expect($('.a').dataset.built).toBeUndefined()
  })
  it('each right arrow builds the next step and stays on the slide', () => {
    key('ArrowRight'); key('ArrowRight')
    expect(shown()).toBe(1)
    expect(window.location.hash).toBe('#2')
    expect($('.a').dataset.built).toBe('')
    expect($('.a').dataset.now).toBe('')
    expect($('.s').dataset.built).toBeUndefined()
    key('ArrowRight')
    expect($('.s').dataset.built).toBe('')
    expect($('.s').dataset.now).toBe('')
    expect($('.a').dataset.now).toBeUndefined()
    expect($('.a').dataset.built).toBe('')
  })
  it('the last step marks the slide complete, and the next arrow moves on', () => {
    key('ArrowRight'); key('ArrowRight'); key('ArrowRight'); key('ArrowRight')
    expect(slides[1].dataset.step).toBe('3')
    expect(slides[1].dataset.complete).toBe('')
    key('ArrowRight')
    expect(shown()).toBe(2)
  })
  it('the left arrow takes back one step, then goes to the previous slide', () => {
    key('ArrowRight'); key('ArrowRight')
    key('ArrowLeft')
    expect(shown()).toBe(1)
    expect($('.a').dataset.built).toBeUndefined()
    key('ArrowLeft')
    expect(shown()).toBe(0)
  })
  it('coming back to a slide shows it complete', () => {
    key('ArrowRight'); key('ArrowRight'); key('ArrowRight'); key('ArrowRight'); key('ArrowRight')
    expect(shown()).toBe(2)
    key('ArrowLeft')
    expect(shown()).toBe(1)
    expect(slides[1].dataset.complete).toBe('')
    expect($('.c').dataset.built).toBe('')
  })
  it('a dot opens its slide complete', () => {
    document.querySelectorAll('.deck__dot')[1].click()
    expect(shown()).toBe(1)
    expect(slides[1].dataset.complete).toBe('')
  })
  it('numbers the pieces of one step in order, for a stagger', () => {
    key('ArrowRight'); key('ArrowRight')
    expect($('.a').style.getPropertyValue('--d')).toBe('0')
    expect($('.b').style.getPropertyValue('--d')).toBe('1')
  })
})

describe('builds when embedded', () => {
  beforeEach(() => {
    vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})
    window.history.replaceState(null, '', '/?embed')
    document.body.dataset.track = 'leaders'
    document.body.dataset.presentation = 'presentacion-01'
    document.body.innerHTML = `
      <nav class="rail"></nav>
      <main class="deck">
        <section class="slide">one</section>
        <section class="slide"><p class="a" data-build="1">a</p></section>
        <section class="slide">three</section>
      </main>`
    mountDeck(window, { presentations })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    window.history.replaceState(null, '', '/')
  })
  it('shows every slide complete and moves slide by slide: the map has no one presenting', () => {
    const slides = [...document.querySelectorAll('section.slide')]
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(slides[1].dataset.complete).toBe('')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(slides.findIndex((s) => !s.hidden)).toBe(2)
  })
})
