import { afterEach, describe, expect, it, vi } from 'vitest'
import { channelName, clockOf, notesOf, pitchFace } from '../../presentations/assets/presenter.js'
import { mountDeck } from '../../presentations/assets/deck.js'

const presentations = [{ id: 'presentacion-01', title: { en: 'One', es: 'Uno' } }]

describe('presenter view helpers', () => {
  it('names one channel per deck page, with or without index.html', () => {
    expect(channelName({ pathname: '/presentations/thesis/presentacion-07/' })).toBe('deck:/presentations/thesis/presentacion-07/')
    expect(channelName({ pathname: '/presentations/thesis/presentacion-07/index.html' })).toBe('deck:/presentations/thesis/presentacion-07/')
  })
  it('shows a duration as a clock face', () => {
    expect(clockOf(0)).toBe('00:00')
    expect(clockOf(65_000)).toBe('01:05')
    expect(clockOf(3_909_000)).toBe('1:05:09')
    expect(clockOf(-5)).toBe('00:00')
  })
  it('says what Space does on a pitch, with its clock and the time left on the slide', () => {
    const p = { state: 'ready', index: 0, elapsed: 0, slideMs: 20000, total: 16 }
    expect(pitchFace(p)).toMatchObject({ en: '▶ Start', now: '00:00', all: '05:20', left: '00:20', live: false })
    expect(pitchFace({ ...p, state: 'running', index: 3, elapsed: 7000 })).toMatchObject({ en: '❚❚ Pause', now: '01:07', left: '00:13', live: true })
    expect(pitchFace({ ...p, state: 'paused' }).en).toBe('▶ Resume')
    expect(pitchFace({ ...p, state: 'done', index: 15, elapsed: 20000 })).toMatchObject({ en: '↺ Again', left: '00:00' })
  })
  it('reads a slide\'s notes from its own aside, empty when it has none', () => {
    document.body.innerHTML = `
      <section class="slide"><p>x</p><aside class="notes"><ul><li><mark class="kw">a</mark></li></ul></aside></section>
      <section class="slide"><p>y</p></section>`
    const [a, b] = document.querySelectorAll('section')
    expect(notesOf(a)).toBe('<ul><li><mark class="kw">a</mark></li></ul>')
    expect(notesOf(b)).toBe('')
  })
})

describe('the deck and its presenter view', () => {
  const real = window.BroadcastChannel
  afterEach(() => { window.BroadcastChannel = real })

  it('tells its state on every change and follows the view\'s commands', () => {
    // a channel stand-in: the deck's posts are kept, and the test plays the view's messages
    const posts = []
    let listener = null
    window.BroadcastChannel = class {
      postMessage(m) { posts.push(m) }
      addEventListener(_, f) { listener = f }
    }
    window.history.replaceState(null, '', '/')
    document.body.dataset.track = 'thesis'
    document.body.dataset.presentation = 'presentacion-01'
    document.body.innerHTML = `
      <nav class="rail"></nav>
      <main class="deck">
        <section class="slide">one</section>
        <section class="slide"><p data-build="1">a</p></section>
        <section class="slide">three</section>
      </main>`
    mountDeck(window, { presentations })
    const slides = [...document.querySelectorAll('section.slide')]
    const shown = () => slides.findIndex((s) => !s.hidden)
    expect(posts.at(-1)).toMatchObject({ type: 'state', index: 0, total: 3 })
    listener({ data: { type: 'forward' } })
    expect(shown()).toBe(1)
    expect(posts.at(-1)).toMatchObject({ index: 1, step: 0, steps: 1 })
    listener({ data: { type: 'forward' } })
    expect(posts.at(-1)).toMatchObject({ index: 1, step: 1 })
    listener({ data: { type: 'goto', index: 2 } })
    expect(shown()).toBe(2)
    listener({ data: { type: 'back' } })
    expect(shown()).toBe(1)
    // going back: the earlier slide is complete, and the page is told not to animate it
    expect(slides[1].dataset.complete).toBe('')
    expect(document.documentElement.dataset.going).toBe('back')
  })

  it('on a pitch, the view drives the clock: Space starts, pauses and resumes; → and ← move; R starts over', () => {
    vi.useFakeTimers()
    const posts = []
    let listener = null
    window.BroadcastChannel = class {
      postMessage(m) { posts.push(m) }
      addEventListener(_, f) { listener = f }
    }
    window.history.replaceState(null, '', '/')
    document.body.removeAttribute('data-pitch-state')
    document.body.dataset.track = 'thesis'
    document.body.dataset.presentation = 'presentacion-01'
    document.body.setAttribute('data-pitch', '')
    document.body.innerHTML = `
      <nav class="rail"></nav>
      <main class="deck">${[1, 2, 3].map((n) => `<section class="slide" data-chapter="c">s${n}</section>`).join('')}</main>`
    document.body.setAttribute('data-pitch', '')
    mountDeck(window, { presentations })
    vi.advanceTimersByTime(0)
    const slides = [...document.querySelectorAll('section.slide')]
    const shown = () => slides.findIndex((s) => !s.hidden)
    const last = (type) => posts.filter((p) => p.type === type).at(-1)
    const say = (type) => listener({ data: { type } })

    // ready: a slide change by the view does not play anything, and the pitch says it is waiting
    expect(document.body.dataset.pitchState).toBe('ready')
    expect(last('pitch')).toMatchObject({ state: 'ready', index: 0, total: 3 })
    // Space (the view's `toggle`) starts; the clock runs and the deck moves on by itself after 20 s
    say('toggle')
    expect(document.body.dataset.pitchState).toBe('running')
    expect(shown()).toBe(0)
    vi.advanceTimersByTime(20_100)
    expect(shown()).toBe(1)
    expect(last('pitch')).toMatchObject({ state: 'running', index: 1 })
    // Space again pauses: the clock holds, and 60 s later it is still on the same slide
    say('toggle')
    expect(document.body.dataset.pitchState).toBe('paused')
    vi.advanceTimersByTime(60_000)
    expect(shown()).toBe(1)
    expect(last('pitch')).toMatchObject({ state: 'paused' })
    // and again resumes
    say('toggle')
    expect(document.body.dataset.pitchState).toBe('running')
    // → goes to the next slide with its own 20 s; ← goes back
    say('forward')
    expect(shown()).toBe(2)
    say('back')
    expect(shown()).toBe(1)
    // R starts over, on the ready screen
    say('restart')
    expect(shown()).toBe(0)
    expect(document.body.dataset.pitchState).toBe('ready')
    // a view that opens late asks, and hears the pitch's state at once
    posts.length = 0
    say('hello')
    expect(last('state')).toMatchObject({ index: 0, total: 3 })
    expect(last('pitch')).toMatchObject({ state: 'ready', index: 0 })
    vi.useRealTimers()
  })
})
