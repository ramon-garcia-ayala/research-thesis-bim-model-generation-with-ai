import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { start } from '../assets/view.js'

const fromDisk = async (path) => (existsSync(join(import.meta.dirname, '..', path)) ? readFileSync(join(import.meta.dirname, '..', path), 'utf8') : null)

const index = {
  tracks: [
    {
      key: 'leaders',
      name: { en: 'Gensler', es: 'Gensler' },
      items: [
        {
          id: 'presentacion-01',
          date: '2026-10-21',
          title: { en: 'Start', es: 'Inicio' },
          slides: [
            { n: 1, title: { en: 'Title', es: 'Título' }, map: [] },
            { n: 2, title: { en: 'Sample', es: 'Muestra' }, map: ['sample-a', 'sample-b', 'question'] },
            { n: 3, title: { en: 'Groups', es: 'Grupos' }, map: ['rules', 'datasets'] },
          ],
        },
      ],
    },
    { key: 'thesis', name: { en: 'IAAC', es: 'IAAC' }, items: [] },
  ],
}

let root
let view
beforeEach(async () => {
  window.localStorage.clear()
  document.body.innerHTML = '<main id="app"></main>'
  root = document.getElementById('app')
  view = await start(root, { load: fromDisk, dir: 'tests/fixture/', index })
})

const $ = (sel) => root.querySelector(sel)
const card = (id) => root.querySelector(`.card[data-id="${id}"]`)
const frame = () => $('.viewer iframe')
/** The deck inside the viewer announcing a slide. */
const deckSays = (data, origin = window.location.origin, source = frame().contentWindow) =>
  window.dispatchEvent(new MessageEvent('message', { data: { type: 'slide', track: 'leaders', presentation: 'presentacion-01', ...data }, origin, source }))

describe('the presentations menu', () => {
  it('has no button, menu or viewer when there are no presentations to show', async () => {
    document.body.innerHTML = '<main id="app"></main>'
    root = document.getElementById('app')
    await start(root, { load: fromDisk, dir: 'tests/fixture/' })
    expect($('.presentations')).toBeNull()
    expect($('.menu')).toBeNull()
  })

  it('opens from the toolbar and lists tracks, presentations and slides', () => {
    expect($('.menu').hidden).toBe(true)
    $('.presentations').click()
    expect($('.menu').hidden).toBe(false)
    expect($('.presentations').getAttribute('aria-pressed')).toBe('true')
    expect([...root.querySelectorAll('.menu__track h3')].map((h) => h.textContent)).toEqual(['Gensler', 'IAAC'])
    expect(root.querySelectorAll('.menu__slide')).toHaveLength(3)
    expect($('.menu__item summary').textContent).toContain('Start')
    expect($('.menu__item summary').textContent).toContain('Oct 21')
  })

  it('marks the slides that use the map with a dot', () => {
    const dots = [...root.querySelectorAll('.menu__slide')].map((b) => b.querySelector('.menu__dot') !== null)
    expect(dots).toEqual([false, true, true])
  })

  it('closes with its button, with the toolbar button and with Escape', () => {
    $('.presentations').click()
    $('.menu__close').click()
    expect($('.menu').hidden).toBe(true)
    $('.presentations').click()
    $('.presentations').click()
    expect($('.menu').hidden).toBe(true)
    $('.presentations').click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect($('.menu').hidden).toBe(true)
  })

  it('shows the titles in Spanish when the language is switched, and tells the deck', () => {
    $('.presentations').click()
    $('.menu__slide').click()
    const post = vi.spyOn(frame().contentWindow, 'postMessage')
    $('.menu__lang').click()
    expect(root.querySelectorAll('.menu__t')[1].textContent).toBe('Muestra')
    expect(post).toHaveBeenCalledWith({ type: 'lang', lang: 'es' }, window.location.origin)
    expect(window.localStorage.getItem('research-map-lang')).toBe('es')
  })
})

describe('the viewer', () => {
  it('a slide click opens the deck embedded at that slide', () => {
    $('.presentations').click()
    root.querySelectorAll('.menu__slide')[1].click()
    expect($('.viewer').hidden).toBe(false)
    expect(frame().getAttribute('src')).toBe('presentations/leaders/presentacion-01/?embed#2')
    expect($('.viewer__title').textContent).toBe('Gensler 01 · 2 / 3')
    expect($('.viewer__present').getAttribute('href')).toBe('presentations/leaders/presentacion-01/#2')
  })

  it('a slide of the deck already open goes there without reloading it', () => {
    $('.presentations').click()
    root.querySelectorAll('.menu__slide')[0].click()
    const post = vi.spyOn(frame().contentWindow, 'postMessage')
    root.querySelectorAll('.menu__slide')[2].click()
    expect(frame().getAttribute('src')).toContain('#1')
    expect(post).toHaveBeenCalledWith({ type: 'goto', index: 2 }, window.location.origin)
  })

  it('follows the deck: its slide is marked in the menu and its map ids light up', () => {
    $('.presentations').click()
    root.querySelectorAll('.menu__slide')[0].click()
    deckSays({ index: 1, total: 3, map: ['sample-a', 'sample-b'] })
    expect($('.viewer__title').textContent).toBe('Gensler 01 · 2 / 3')
    expect(root.querySelectorAll('.menu__slide')[1].getAttribute('aria-current')).toBe('true')
    expect(root.querySelectorAll('.menu__slide')[0].getAttribute('aria-current')).toBeNull()
    expect(card('sample-a').classList.contains('lit')).toBe(true)
    expect(card('sample-c').classList.contains('dim')).toBe(true)
  })

  it('a slide that uses nothing puts the map back as it was', () => {
    $('.presentations').click()
    root.querySelectorAll('.menu__slide')[0].click()
    deckSays({ index: 1, total: 3, map: ['sample-a'] })
    deckSays({ index: 0, total: 3, map: [] })
    expect(root.querySelectorAll('.card.lit, .card.dim')).toHaveLength(0)
  })

  it('ignores a message that does not come from its own deck', () => {
    $('.presentations').click()
    root.querySelectorAll('.menu__slide')[0].click()
    deckSays({ index: 1, total: 3, map: ['sample-a'] }, 'https://evil.example')
    deckSays({ index: 1, total: 3, map: ['sample-a'] }, window.location.origin, window)
    expect(root.querySelectorAll('.card.lit')).toHaveLength(0)
  })

  it('closing the viewer clears the highlight', () => {
    $('.presentations').click()
    root.querySelectorAll('.menu__slide')[1].click()
    deckSays({ index: 1, total: 3, map: ['sample-a'] })
    $('.viewer__close').click()
    expect($('.viewer').hidden).toBe(true)
    expect(frame().getAttribute('src')).toBeNull()
    expect(root.querySelectorAll('.card.lit, .card.dim')).toHaveLength(0)
  })
})

describe('in presentations (a node to its slides)', () => {
  it('a node panel lists the slides that use it and opens the viewer there', () => {
    card('sample-a').click()
    const open = $('.panel [data-open="leaders|presentacion-01|2"]')
    expect(open.textContent).toContain('Gensler 01')
    expect(open.textContent).toContain('2. Sample')
    open.click()
    expect($('.viewer').hidden).toBe(false)
    expect(frame().getAttribute('src')).toContain('presentacion-01/?embed#2')
  })

  it('a node no slide uses has no such section', () => {
    card('sample-c').click()
    expect($('.panel').textContent).not.toContain('In presentations')
  })

  it('the question lists its slides too', () => {
    root.querySelector('.part[data-id="question"]').click()
    expect($('.panel [data-open="leaders|presentacion-01|2"]')).not.toBeNull()
  })
})
