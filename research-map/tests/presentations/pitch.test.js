import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountDeck } from '../../presentations/assets/deck.js'
import { SLIDE_MS, TICK_MS, chaptersOf, clock, fillsOf, mountDotFields, mountPitch } from '../../presentations/assets/pitch.js'

const SIZES = [3, 3, 1, 3, 3, 2]
const NAMES = ['Topic & context', 'Innovation', 'Actors', 'Exploit', 'Impact', 'Readiness & next']

const html = () =>
  `<nav class="rail"></nav><main class="deck">${SIZES.map((n, c) =>
    Array.from({ length: n }, (_, k) => `<section class="slide" data-chapter="${NAMES[c]}">c${c}s${k}</section>`).join(''),
  ).join('')}</main>`

const press = (pitch, key) => pitch.key({ key, preventDefault() {} })

/** A deck of 15 slides without the pitch hook, with a pitch mounted by hand (so a test can call its `key` directly). */
function setup() {
  window.location.hash = ''
  document.body.removeAttribute('data-pitch')
  document.body.dataset.track = 'thesis'
  document.body.dataset.presentation = 'presentacion-06'
  document.body.innerHTML = html()
  delete document.body.dataset.pitchState
  const api = mountDeck(window, { presentations: [] })
  const pitch = mountPitch(window, api)
  // jsdom queues a hashchange for the hash the deck writes; let it fire now, not in the middle of a test's clock jump
  vi.advanceTimersByTime(0)
  return { api, pitch }
}

describe('chaptersOf', () => {
  it('groups consecutive slides by data-chapter', () => {
    document.body.innerHTML = html()
    const chapters = chaptersOf([...document.querySelectorAll('section.slide')])
    expect(chapters.map((c) => c.count)).toEqual(SIZES)
    expect(chapters.map((c) => c.first)).toEqual([0, 3, 6, 7, 10, 13])
    expect(chapters.map((c) => c.name)).toEqual(NAMES)
  })
})

describe('fillsOf and clock', () => {
  const chapters = SIZES.map((count, i) => ({ name: NAMES[i], first: [0, 3, 6, 7, 10, 13][i], count }))
  it('fills the chapters before, part of the current one, none after', () => {
    expect(fillsOf(chapters, 4, 0.5)).toEqual([1, 0.5, 0, 0, 0, 0])
  })
  it('formats m:ss', () => {
    expect(clock(65000)).toBe('1:05')
    expect(clock(300000)).toBe('5:00')
  })
})

describe('mountPitch', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('waits on the ready screen with the first slide, a bar of six chapters and a hint', () => {
    const { api } = setup()
    expect(document.body.dataset.pitchState).toBe('ready')
    expect(api.index()).toBe(0)
    const segs = [...document.querySelectorAll('.pitch__bar .pitch__seg')]
    expect(segs).toHaveLength(6)
    expect(segs.map((s) => s.style.getPropertyValue('--n'))).toEqual(SIZES.map(String))
    expect(document.querySelector('.pitch__hint').hidden).toBe(false)
    vi.advanceTimersByTime(60000)
    expect(api.index()).toBe(0)
  })

  it('Space on the ready screen starts and stays on slide 1', () => {
    const { api, pitch } = setup()
    expect(press(pitch, ' ')).toBe(true)
    expect(pitch.state()).toBe('running')
    expect(api.index()).toBe(0)
    expect(document.querySelector('.pitch__hint').hidden).toBe(true)
  })

  it('ArrowRight on the ready screen starts and does not skip', () => {
    const { api, pitch } = setup()
    press(pitch, 'ArrowRight')
    expect(pitch.state()).toBe('running')
    expect(api.index()).toBe(0)
  })

  it('a click on the stage starts it', () => {
    const { pitch } = setup()
    document.querySelector('.stage').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(pitch.state()).toBe('running')
  })

  it('after 20 s it is on slide 2', () => {
    const { api, pitch } = setup()
    press(pitch, ' ')
    vi.advanceTimersByTime(SLIDE_MS - TICK_MS)
    expect(api.index()).toBe(0)
    vi.advanceTimersByTime(TICK_MS)
    expect(api.index()).toBe(1)
  })

  it('after 300 s it is done on slide 15', () => {
    const { api, pitch } = setup()
    press(pitch, ' ')
    vi.advanceTimersByTime(15 * SLIDE_MS)
    expect(api.index()).toBe(14)
    expect(pitch.state()).toBe('done')
    expect(document.querySelector('.pitch__clock').textContent).toBe('5:00 / 5:00')
    vi.advanceTimersByTime(60000)
    expect(api.index()).toBe(14)
  })

  it('10 s paused then resumed still takes 20 s on the slide', () => {
    const { api, pitch } = setup()
    press(pitch, ' ')
    vi.advanceTimersByTime(5000)
    press(pitch, ' ')
    expect(pitch.state()).toBe('paused')
    vi.advanceTimersByTime(10000)
    expect(api.index()).toBe(0)
    press(pitch, ' ')
    vi.advanceTimersByTime(14900)
    expect(api.index()).toBe(0)
    vi.advanceTimersByTime(200)
    expect(api.index()).toBe(1)
  })

  it('one tick after a 100 s stall advances one slide, not five', () => {
    const { api, pitch } = setup()
    press(pitch, ' ')
    vi.setSystemTime(Date.now() + 100000)
    vi.advanceTimersByTime(TICK_MS)
    expect(api.index()).toBe(1)
  })

  it('a manual → resets the 20 s of the new slide', () => {
    const { api, pitch } = setup()
    press(pitch, ' ')
    vi.advanceTimersByTime(15000)
    press(pitch, 'ArrowRight')
    expect(api.index()).toBe(1)
    vi.advanceTimersByTime(19900)
    expect(api.index()).toBe(1)
    vi.advanceTimersByTime(200)
    expect(api.index()).toBe(2)
  })

  it('← on the first slide and → on the last do not move', () => {
    const { api, pitch } = setup()
    press(pitch, ' ')
    expect(press(pitch, 'ArrowLeft')).toBe(true)
    expect(api.index()).toBe(0)
    api.show(14)
    expect(press(pitch, 'ArrowRight')).toBe(true)
    expect(api.index()).toBe(14)
  })

  it('r restarts at slide 1 on the ready screen', () => {
    const { api, pitch } = setup()
    press(pitch, ' ')
    vi.advanceTimersByTime(45000)
    expect(api.index()).toBe(2)
    press(pitch, 'r')
    expect(api.index()).toBe(0)
    expect(pitch.state()).toBe('ready')
  })

  it('Space on a finished pitch restarts it', () => {
    const { api, pitch } = setup()
    press(pitch, ' ')
    vi.advanceTimersByTime(15 * SLIDE_MS)
    press(pitch, ' ')
    expect(api.index()).toBe(0)
    expect(pitch.state()).toBe('ready')
  })

  it('a slide reached while paused is shown complete, and plays again once resumed', () => {
    const { api, pitch } = setup()
    press(pitch, ' ')
    vi.advanceTimersByTime(5000)
    press(pitch, ' ') // paused
    press(pitch, 'ArrowRight')
    expect(api.slides[1].hasAttribute('data-pitch-still')).toBe(true)
    press(pitch, ' ') // resumed: the slide plays from its start, with its own 20 s
    expect(api.slides[1].hasAttribute('data-pitch-still')).toBe(false)
  })

  it('after the end, ← shows the previous slide complete', () => {
    const { api, pitch } = setup()
    press(pitch, ' ')
    vi.advanceTimersByTime(15 * SLIDE_MS)
    expect(pitch.state()).toBe('done')
    press(pitch, 'ArrowLeft')
    expect(api.index()).toBe(13)
    expect(api.slides[13].hasAttribute('data-pitch-still')).toBe(true)
  })

  it('a slide that moving running does not change is not marked still', () => {
    const { api, pitch } = setup()
    press(pitch, ' ')
    vi.advanceTimersByTime(SLIDE_MS)
    expect(api.slides[1].hasAttribute('data-pitch-still')).toBe(false)
  })

  it('→ on the last slide keeps its clock: it still ends 20 s after it began', () => {
    const { api, pitch } = setup()
    press(pitch, ' ')
    api.show(14)
    vi.advanceTimersByTime(10000)
    press(pitch, 'ArrowRight') // nowhere to go
    vi.advanceTimersByTime(9900)
    expect(pitch.state()).toBe('running')
    vi.advanceTimersByTime(200)
    expect(pitch.state()).toBe('done')
  })

  it('← on the first slide keeps its clock: it still moves on 20 s after it began', () => {
    const { api, pitch } = setup()
    press(pitch, ' ')
    vi.advanceTimersByTime(10000)
    press(pitch, 'ArrowLeft') // nowhere to go
    vi.advanceTimersByTime(9900)
    expect(api.index()).toBe(0)
    vi.advanceTimersByTime(200)
    expect(api.index()).toBe(1)
  })

  it('a key it does not own is not handled', () => {
    const { pitch } = setup()
    expect(press(pitch, 'f')).toBe(false)
    expect(press(pitch, 'Home')).toBe(false)
  })

  it('the current chapter marks itself and fills with time', () => {
    const { pitch } = setup()
    press(pitch, ' ')
    vi.advanceTimersByTime(10000)
    const segs = [...document.querySelectorAll('.pitch__seg')]
    expect(segs[0].getAttribute('aria-current')).toBe('step')
    expect(segs[1].getAttribute('aria-current')).toBeNull()
    expect(Number.parseFloat(segs[0].style.getPropertyValue('--fill'))).toBeCloseTo(1 / 6, 3)
    expect(document.querySelector('.pitch__clock').textContent).toBe('0:10 / 5:00')
  })
})

describe('the pitch hook of mountDeck', () => {
  const url = () => window.location.href
  let original
  beforeEach(() => {
    original = url()
    window.location.hash = ''
    document.body.dataset.track = 'thesis'
    document.body.dataset.presentation = 'presentacion-06'
    document.body.innerHTML = html()
    delete document.body.dataset.pitchState
  })
  afterEach(() => {
    window.history.replaceState(null, '', original)
    document.body.removeAttribute('data-pitch')
    delete document.body.dataset.pitchState
  })

  it('mounts the pitch on a body with data-pitch', () => {
    document.body.dataset.pitch = ''
    mountDeck(window, { presentations: [] })
    expect(document.querySelector('.pitch__bar')).not.toBeNull()
    expect(document.body.dataset.pitchState).toBe('ready')
  })

  it('does not mount it embedded', () => {
    window.history.replaceState(null, '', '?embed')
    document.body.dataset.pitch = ''
    mountDeck(window, { presentations: [] })
    expect(document.querySelector('.pitch__bar')).toBeNull()
    expect(document.body.dataset.pitchState).toBeUndefined()
  })

  it('does not mount it on a deck without data-pitch', () => {
    mountDeck(window, { presentations: [] })
    expect(document.querySelector('.pitch__bar')).toBeNull()
    expect(document.body.dataset.pitchState).toBeUndefined()
  })

  it('the keys reach the pitch first: the first → starts instead of skipping', () => {
    document.body.dataset.pitch = ''
    const api = mountDeck(window, { presentations: [] })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.body.dataset.pitchState).toBe('running')
    expect(api.index()).toBe(0)
  })
})

describe('mountDotFields', () => {
  const field = (attrs) => {
    document.body.innerHTML = `<div class="dotfield" ${attrs}></div>`
    mountDotFields(document)
    return document.querySelector('.dotfield')
  }

  it('creates data-total dots', () => {
    expect(field('data-total="57" data-lit="10"').children).toHaveLength(57)
  })

  it('marks exactly data-lit of them as lit, scattered, not the first ten', () => {
    const dots = [...field('data-total="57" data-lit="10"').children]
    const lit = dots.map((d, i) => (d.hasAttribute('data-lit') ? i : -1)).filter((i) => i >= 0)
    expect(lit).toHaveLength(10)
    expect(lit).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(field('data-total="50" data-lit="22"').querySelectorAll('[data-lit]')).toHaveLength(22)
  })

  it('numbers the dots for their staggered dimming', () => {
    const dots = [...field('data-total="5" data-lit="2"').children]
    expect(dots.map((d) => d.style.getPropertyValue('--i'))).toEqual(['0', '1', '2', '3', '4'])
  })

  it('lights them all when data-lit is missing, and does not double up when mounted twice', () => {
    const f = field('data-total="6"')
    expect(f.querySelectorAll('[data-lit]')).toHaveLength(6)
    mountDotFields(document)
    expect(f.children).toHaveLength(6)
  })

  it('does nothing to an element without data-total', () => {
    expect(field('').children).toHaveLength(0)
  })
})
