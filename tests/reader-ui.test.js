import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LABELS } from '../assets/reader-ui.js'
import { emptyReading } from '../assets/reading.js'
import { start } from '../assets/view.js'
import { Utterance, fakeSynth } from './fake-speech.js'

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
    window.speechSynthesis = fakeSynth()
    window.SpeechSynthesisUtterance = Utterance
    document.body.innerHTML = '<main id="app"></main>'
    root = document.getElementById('app')
    view = await start(root, { load: fromDisk, dir: 'tests/fixture/', index })
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
    expect(acts).toEqual(['read-from', 'read-selection'])
    delete window.speechSynthesis
    delete window.SpeechSynthesisUtterance
  })

  it('says so when a paper cannot be loaded', async () => {
    await view.reader.open('sample-b')
    expect($('.reader__text').textContent).toContain(LABELS.es.notPrepared)
  })
})

describe('voice', () => {
  let synth
  /** A fresh map whose window has a (fake) speechSynthesis. */
  const withVoice = async (voices = [{ name: 'Microsoft Dalia Online (Natural) - Spanish (Mexico)', lang: 'es-MX' }]) => {
    synth = fakeSynth(voices)
    window.speechSynthesis = synth
    window.SpeechSynthesisUtterance = Utterance
    document.body.innerHTML = '<main id="app"></main>'
    root = document.getElementById('app')
    view = await start(root, { load: fromDisk, dir: 'tests/fixture/', index })
  }
  const lastSpoken = () => synth.spoken.at(-1)
  /** Selects the first `n` characters of block `id` and lifts the mouse, as the author would. */
  const select = (id, n = 5) => {
    const el = block(id)
    const range = document.createRange()
    range.setStart(el.firstChild, 0)
    range.setEnd(el.firstChild, n)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  }
  afterEach(() => {
    delete window.speechSynthesis
    delete window.SpeechSynthesisUtterance
  })

  it('hides the voice controls when the browser cannot speak', async () => {
    await read('sample-a')
    expect($('.reader__voice').children).toHaveLength(0)
  })

  it('reads the whole paper from the top and lights the sentence being read', async () => {
    await withVoice()
    await read('sample-a')
    $('[data-voice="play"]').click()
    expect(lastSpoken().text).toBe(textOfBlock('s1-p1').en.split('. ')[0] + '.')
    expect(block('s1-p1').querySelector('.speaking').textContent).toBe(lastSpoken().text)
    synth.finish()
    expect(block('s1-p1').querySelector('.speaking').textContent).toBe('We generate them from rules.')
  })

  it('reads from a selected point on', async () => {
    await withVoice()
    await read('sample-a')
    select('s2-p1')
    $('.reader__pop [data-act="read-from"]').click()
    expect(lastSpoken().text).toBe(es_s2p1)
  })

  it('reads only the selection', async () => {
    await withVoice()
    await read('sample-a')
    select('s2-p2', 12)
    $('.reader__pop [data-act="read-selection"]').click()
    expect(lastSpoken().text).toBe(en_s2p2.slice(0, 12))
    synth.finish()
    expect(synth.spoken).toHaveLength(1)
  })

  it('switching language while reading resumes the same block in the other language', async () => {
    await withVoice()
    await read('sample-a')
    select('s2-p1')
    $('.reader__pop [data-act="read-from"]').click()
    view.reader.setLang('en')
    expect(synth.cancel).toHaveBeenCalled()
    expect(lastSpoken().text).toBe(textOfBlock('s2-p1').en)
  })

  it('a language switch while reading changes to a voice of that language', async () => {
    await withVoice([{ name: 'Dalia (Natural)', lang: 'es-MX' }, { name: 'Aria (Natural)', lang: 'en-US' }])
    await read('sample-a')
    $('[data-voice="play"]').click()
    expect(lastSpoken().lang).toBe('es-MX')
    view.reader.setLang('en')
    expect(lastSpoken().lang).toBe('en-US')
    expect($('.reader__voices').value).toBe('Aria (Natural)')
  })

  it('pauses, resumes and stops from the bar', async () => {
    await withVoice()
    await read('sample-a')
    $('[data-voice="play"]').click()
    $('[data-voice="pause"]').click()
    expect(synth.pause).toHaveBeenCalled()
    $('[data-voice="pause"]').click()
    expect(synth.resume).toHaveBeenCalled()
    $('[data-voice="stop"]').click()
    expect(root.querySelector('.speaking')).toBeNull()
  })

  it('changes the speed', async () => {
    await withVoice()
    await read('sample-a')
    $('[data-voice="play"]').click()
    const rate = $('.reader__rate')
    rate.value = '1.5'
    rate.dispatchEvent(new Event('change', { bubbles: true }))
    expect(lastSpoken().rate).toBe(1.5)
  })

  it('closing the reader stops the voice', async () => {
    await withVoice()
    await read('sample-a')
    $('[data-voice="play"]').click()
    escape()
    expect(synth.cancel).toHaveBeenCalled()
    expect(root.querySelector('.speaking')).toBeNull()
  })

  it('says once that Edge has natural voices when none is offered', async () => {
    await withVoice([{ name: 'Microsoft Sabina - Spanish (Mexico)', lang: 'es-MX' }])
    await read('sample-a')
    expect($('.reader__hint').hidden).toBe(false)
    expect(window.localStorage.getItem('research-map-reader-voice-hint')).toBe('shown')
    view.reader.close()
    await read('sample-a')
    expect($('.reader__hint').hidden).toBe(true)
  })
})

describe('underlines and the remembered place', () => {
  let client
  /** A fake client of the local server; `reading` is what it has stored for the paper. */
  const fakeClient = (reading = emptyReading(), up = true) => ({
    available: vi.fn(async () => up),
    load: vi.fn(async () => structuredClone(reading)),
    save: vi.fn(),
    flush: vi.fn(async () => {}),
    chat: vi.fn(),
    draftNote: vi.fn(),
    saveNote: vi.fn(),
  })
  const withClient = async (c) => {
    client = c
    document.body.innerHTML = '<main id="app"></main>'
    root = document.getElementById('app')
    view = await start(root, { load: fromDisk, dir: 'tests/fixture/', index, client })
  }
  const select = (id, n = 5) => {
    const el = block(id)
    const range = document.createRange()
    range.setStart(el.firstChild, 0)
    range.setEnd(el.firstChild, n)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  }
  const lastSaved = () => client.save.mock.calls.at(-1)[1]

  it('underlines a selection and saves it', async () => {
    await withClient(fakeClient())
    await read('sample-a')
    select('s2-p1', 12)
    $('.reader__pop [data-act="underline"]').click()
    expect(block('s2-p1').querySelector('mark[data-u="u1"]').textContent).toBe(es_s2p1.slice(0, 12))
    expect(client.save).toHaveBeenCalled()
    expect(client.save.mock.calls.at(-1)[0]).toBe('sample-a')
    expect(lastSaved().underlines[0]).toMatchObject({ id: 'u1', block: 's2-p1', lang: 'es', start: 0, end: 12, text: es_s2p1.slice(0, 12) })
  })

  it('shows a margin mark in the other language', async () => {
    const reading = { ...emptyReading(), underlines: [{ id: 'u1', block: 's2-p1', lang: 'es', start: 0, end: 12, text: 'x', date: '2026-10-22' }] }
    await withClient(fakeClient(reading))
    await read('sample-a')
    expect(block('s2-p1').querySelector('mark')).not.toBeNull()
    view.reader.setLang('en')
    expect(block('s2-p1').classList.contains('has-underline')).toBe(true)
    expect(block('s2-p1').querySelector('mark')).toBeNull()
  })

  it('removes an underline from its mark', async () => {
    const reading = { ...emptyReading(), underlines: [{ id: 'u1', block: 's2-p1', lang: 'es', start: 0, end: 12, text: 'x', date: '2026-10-22' }] }
    await withClient(fakeClient(reading))
    await read('sample-a')
    block('s2-p1').querySelector('mark').click()
    $('.reader__pop [data-act="remove-underline"]').click()
    expect(block('s2-p1').querySelector('mark')).toBeNull()
    expect(lastSaved().underlines).toEqual([])
  })

  it('says so when the reading could not be saved', async () => {
    await withClient(fakeClient())
    await read('sample-a')
    root.dispatchEvent(new CustomEvent('reader-save-error', { detail: 'disk full' }))
    expect($('.reader__hint').hidden).toBe(false)
    expect($('.reader__hint').textContent).toContain('No se pudo guardar tu lectura: disk full')
  })

  it('lists the underlines in the side column, kept up to date', async () => {
    const reading = { ...emptyReading(), underlines: [{ id: 'u1', block: 's2-p1', lang: 'es', start: 0, end: 12, text: 'lo subrayado', date: '2026-10-22' }] }
    await withClient(fakeClient(reading))
    await read('sample-a')
    const listed = () => [...$('.reader__side').querySelectorAll('.reader__underlines [data-goto]')]
    expect(listed().map((b) => [b.dataset.goto, b.textContent.includes('lo subrayado')])).toEqual([['s2-p1', true]])
    block('s2-p1').querySelector('mark').click()
    $('.reader__pop [data-act="remove-underline"]').click()
    expect(listed()).toEqual([])
    select('s2-p1', 12)
    $('.reader__pop [data-act="underline"]').click()
    expect(listed().map((b) => b.dataset.goto)).toEqual(['s2-p1'])
  })

  it('reopens at the remembered block and language', async () => {
    const seen = []
    Element.prototype.scrollIntoView = function () {
      seen.push(this.dataset?.block)
    }
    await withClient(fakeClient({ ...emptyReading(), lang: 'en', position: { block: 's2-p2', sentence: 0 } }))
    await read('sample-a')
    expect(view.reader.lang()).toBe('en')
    expect(block('s2-p1').textContent).toBe(textOfBlock('s2-p1').en)
    expect(seen).toContain('s2-p2')
    delete Element.prototype.scrollIntoView
  })

  it('never sends the chats: the server alone writes them', async () => {
    const reading = { ...emptyReading(), chats: [{ id: 'c1', papers: ['sample-a'], messages: [{ role: 'user', mode: 'ask', text: 'Hola', date: '2026-10-22' }] }] }
    await withClient(fakeClient(reading))
    await read('sample-a')
    select('s2-p1', 12)
    $('.reader__pop [data-act="underline"]').click()
    expect(lastSaved()).not.toHaveProperty('chats')
    expect(lastSaved().underlines).toHaveLength(1)
  })

  it('saves the language chosen', async () => {
    await withClient(fakeClient())
    await read('sample-a')
    view.reader.setLang('en')
    expect(lastSaved().lang).toBe('en')
  })

  it('shows the chat with the server, and Ask puts the selection in it as a chip', async () => {
    await withClient(fakeClient())
    await read('sample-a')
    expect($('.reader__chat').hidden).toBe(false)
    expect($('.reader__chat .chat__input')).not.toBeNull()
    select('s2-p1', 12)
    $('.reader__pop [data-act="ask"]').click()
    expect($('.chat__chips').textContent).toContain(es_s2p1.slice(0, 12))
  })

  it('a citation in the chat scrolls the reader to the paragraph', async () => {
    const seen = []
    Element.prototype.scrollIntoView = function () {
      seen.push(this.dataset?.block)
    }
    const reading = { ...emptyReading(), chats: [{ id: 'c1', papers: ['sample-a'], messages: [{ role: 'assistant', mode: 'ask', text: 'Mira [¶ s2-p2]', date: '2026-10-22' }] }] }
    await withClient(fakeClient(reading))
    await read('sample-a')
    $('.reader__chat button[data-cite="s2-p2"]').click()
    expect(seen).toContain('s2-p2')
    delete Element.prototype.scrollIntoView
  })

  it('lets the author type "/" and press Esc in the chat box', async () => {
    await withClient(fakeClient())
    await read('sample-a')
    const box = $('.chat__input')
    box.focus()
    const slash = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })
    box.dispatchEvent(slash)
    expect(slash.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(box)
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(view.reader.isOpen()).toBe(true)
  })

  it('offers no Underline when the server does not answer', async () => {
    await withClient(fakeClient(emptyReading(), false))
    await read('sample-a')
    select('s2-p1')
    expect($('.reader__pop [data-act="underline"]')).toBeNull()
    expect(client.load).not.toHaveBeenCalled()
  })
})

describe('on a phone', () => {
  afterEach(() => Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true }))

  it('is always full, one column, with the contents behind a button', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true })
    document.body.innerHTML = '<main id="app"></main>'
    root = document.getElementById('app')
    view = await start(root, { load: fromDisk, dir: 'tests/fixture/', index })
    await read('sample-a')
    expect($('.reader').dataset.mode).toBe('full')
    expect($('.reader__mode').hidden).toBe(true)
    expect($('.reader').classList.contains('side-open')).toBe(false)
    $('.reader__contents').click()
    expect($('.reader').classList.contains('side-open')).toBe(true)
    $('.reader__toc [data-goto="s2"]').click()
    expect($('.reader').classList.contains('side-open')).toBe(false)
  })
})
