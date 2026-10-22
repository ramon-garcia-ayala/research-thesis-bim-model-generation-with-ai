import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { LABELS } from '../assets/reader-ui.js'
import { start } from '../assets/view.js'

const fromDisk = async (path) => (existsSync(join(import.meta.dirname, '..', path)) ? readFileSync(join(import.meta.dirname, '..', path), 'utf8') : null)
const paper = JSON.parse(readFileSync(join(import.meta.dirname, 'fixture/papers/sample-a/paper.json'), 'utf8'))
const textOfBlock = (id) => paper.sections.flatMap((s) => s.blocks).find((b) => b.id === id).text
const es_s2p1 = textOfBlock('s2-p1').es
const en_s2p2 = textOfBlock('s2-p2').en

const index = {
  tracks: [
    {
      key: 'leaders',
      name: { en: 'Gensler', es: 'Gensler' },
      items: [{ id: 'presentacion-01', date: '2026-10-21', title: { en: 'Start', es: 'Inicio' }, slides: [{ n: 1, title: { en: 'T', es: 'T' }, map: ['sample-b'] }] }],
    },
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
const block = (id) => $(`.reader__text [data-block="${id}"]`)
const read = (id) => view.reader.open(id)
const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

describe('opening a paper', () => {
  it('shows Read in a prepared paper panel and Papers in the toolbar', () => {
    view.select('sample-a')
    expect($('.panel [data-read="sample-a"]')).not.toBeNull()
    view.select('sample-b')
    expect($('.panel [data-read]')).toBeNull()
    expect($('.toolbar .papers')).not.toBeNull()
  })

  it('lists the prepared papers under Papers and opens one from there', async () => {
    $('.toolbar .papers').click()
    const item = $('.papers-menu [data-read="sample-a"]')
    expect(item.textContent).toContain('Sample paper A')
    item.click()
    await view.reader.ready()
    expect(view.reader.isOpen()).toBe(true)
    expect($('.papers-menu').hidden).toBe(true)
  })

  it('has no Papers button when no paper is prepared', async () => {
    document.body.innerHTML = '<main id="app"></main>'
    root = document.getElementById('app')
    await start(root, { load: async (p) => (p.endsWith('papers/index.json') ? null : fromDisk(p)), dir: 'tests/fixture/', index })
    expect($('.toolbar .papers')).toBeNull()
  })

  it('opens in half mode, in Spanish, falling back to English', async () => {
    await read('sample-a')
    expect($('.reader').hidden).toBe(false)
    expect($('.reader').dataset.mode).toBe('half')
    expect(block('s2-p1').textContent).toBe(es_s2p1)
    expect(block('s2-p2').textContent).toBe(en_s2p2)
    expect($('.reader__title').textContent).toBe(paper.title)
  })

  it('switches to English and back', async () => {
    await read('sample-a')
    $('.reader__lang[data-lang="en"]').click()
    expect(block('s2-p1').textContent).toBe(textOfBlock('s2-p1').en)
    expect($('.reader__lang[data-lang="en"]').getAttribute('aria-pressed')).toBe('true')
    expect(window.localStorage.getItem('research-map-reader-lang')).toBe('en')
    $('.reader__lang[data-lang="es"]').click()
    expect(block('s2-p1').textContent).toBe(es_s2p1)
  })

  it('switches half ↔ full and remembers it', async () => {
    await read('sample-a')
    $('.reader__mode').click()
    expect($('.reader').dataset.mode).toBe('full')
    expect(window.localStorage.getItem('research-map-reader-mode')).toBe('full')
    expect($('.reader__side').hidden).toBe(false)
    $('.reader__mode').click()
    expect($('.reader').dataset.mode).toBe('half')
  })

  it('labels its buttons in the reader’s language', async () => {
    await read('sample-a')
    expect($('.reader__close').getAttribute('aria-label')).toBe(LABELS.es.close)
    view.reader.setLang('en')
    expect($('.reader__close').getAttribute('aria-label')).toBe(LABELS.en.close)
  })
})

describe('figures', () => {
  it('places the figure with its caption', async () => {
    await read('sample-a')
    expect($('figure[data-block="fig-1"] img').getAttribute('src')).toBe('tests/fixture/papers/sample-a/fig/fig-1.png')
    expect($('figure[data-block="fig-1"] figcaption').textContent).toBe(textOfBlock('fig-1').en)
  })

  it('shows only the caption when a figure image fails to load', async () => {
    await read('sample-a')
    $('figure[data-block="fig-1"] img').dispatchEvent(new Event('error'))
    expect($('figure[data-block="fig-1"]').classList.contains('missing')).toBe(true)
    expect($('figure[data-block="fig-1"] img')).toBeNull()
    expect($('figure[data-block="fig-1"] figcaption').textContent).toBe(textOfBlock('fig-1').en)
  })

  it('opens a figure enlarged on click and closes it with Esc', async () => {
    await read('sample-a')
    $('figure[data-block="fig-1"] img').click()
    expect($('dialog.reader__zoom').open).toBe(true)
    expect($('dialog.reader__zoom img').getAttribute('src')).toBe('tests/fixture/papers/sample-a/fig/fig-1.png')
    escape()
    expect($('dialog.reader__zoom').open).toBe(false)
    expect(view.reader.isOpen()).toBe(true)
  })
})

describe('the reader and the map', () => {
  it('lights the paper and the nodes it links to, and closes the panel and the viewer', async () => {
    view.select('sample-b')
    root.querySelector('.menu__slide')?.click()
    await read('sample-a')
    expect($('.viewer').hidden).toBe(true)
    expect($('.panel').hidden).toBe(true)
    expect(card('sample-a').classList.contains('lit')).toBe(true)
    expect(card('sample-c').classList.contains('dim')).toBe(true)
  })

  it('Esc closes the reader and clears the light', async () => {
    await read('sample-a')
    escape()
    expect(view.reader.isOpen()).toBe(false)
    expect($('.reader').hidden).toBe(true)
    expect(card('sample-a').classList.contains('lit')).toBe(false)
  })

  it('hides underlining, chat and quizzes without a client', async () => {
    await read('sample-a')
    expect($('.reader__chat').hidden).toBe(true)
    const p = block('s2-p2')
    const range = document.createRange()
    range.setStart(p.firstChild, 0)
    range.setEnd(p.firstChild, 10)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)
    p.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    const acts = [...root.querySelectorAll('.reader__pop button')].map((b) => b.dataset.act)
    expect(acts).toEqual(['read-from'])
  })

  it('says so when a paper cannot be loaded', async () => {
    await view.reader.open('sample-b')
    expect($('.reader__text').textContent).toContain(LABELS.es.notPrepared)
  })
})
