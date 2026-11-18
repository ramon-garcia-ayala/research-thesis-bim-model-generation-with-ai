import { afterEach, describe, expect, it } from 'vitest'
import { channelName, clockOf, notesOf } from '../../presentations/assets/presenter.js'
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
})
