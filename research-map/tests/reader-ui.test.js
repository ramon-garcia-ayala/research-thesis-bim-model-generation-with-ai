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
    const first = lastSpoken().text
    $('[data-voice="pause"]').click()
    expect(synth.cancel).toHaveBeenCalled()
    const said = synth.spoken.length
    $('[data-voice="pause"]').click()
    expect(synth.spoken).toHaveLength(said + 1)
    expect(lastSpoken().text).toBe(first)
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

describe('citations and following the voice', () => {
  const cited = {
    ...paper,
    sections: paper.sections.map((s) =>
      s.id === 's1'
        ? { ...s, blocks: [{ id: 's1-p1', type: 'paragraph', page: 1, text: { en: 'Agents need houses [1, 2]. Grids help [2]. Values in [0, 1] stay.' } }, ...s.blocks.slice(1)] }
        : s.id === 'refs'
          ? { ...s, blocks: [{ id: 'refs-1', type: 'paragraph', page: 3, text: { en: '[1] M. Deitke. ProcTHOR. https://arxiv.org/abs/2206.06994' } }, { id: 'refs-2', type: 'paragraph', page: 3, text: { en: '[2] A. Author. A title.' } }] }
          : s,
    ),
  }
  let synth
  let scrolled
  const original = Element.prototype.scrollIntoView
  beforeEach(async () => {
    synth = fakeSynth([{ name: 'Microsoft Jenny Online (Natural) - English (United States)', lang: 'en-US' }])
    window.speechSynthesis = synth
    window.SpeechSynthesisUtterance = Utterance
    scrolled = []
    Element.prototype.scrollIntoView = function () {
      scrolled.push(this.dataset.block)
    }
    document.body.innerHTML = '<main id="app"></main>'
    root = document.getElementById('app')
    const load = async (p) => (p.endsWith('sample-a/paper.json') ? JSON.stringify(cited) : fromDisk(p))
    view = await start(root, { load, dir: 'tests/fixture/', index })
    await read('sample-a')
    view.reader.setLang('en')
  })
  afterEach(() => {
    delete window.speechSynthesis
    delete window.SpeechSynthesisUtterance
    Element.prototype.scrollIntoView = original
  })
  const cite = (n) => $(`.reader__text [data-block="s1-p1"] .cite[data-cite="${n}"]`)
  const play = () => $('[data-voice="play"]').click()
  const nextSentence = () => synth.spoken.at(-1).onend?.()

  it('makes each number of a citation a link, and leaves other brackets as text', () => {
    expect(block('s1-p1').textContent).toBe('Agents need houses [1, 2]. Grids help [2]. Values in [0, 1] stay.')
    expect([...block('s1-p1').querySelectorAll('.cite')].map((c) => c.textContent)).toEqual(['1', '2', '2'])
    expect($('.reader__text [data-block="refs-1"] .cite')).toBeNull()
  })

  it('shows the reference and its link in a window, without moving the text', () => {
    scrolled.length = 0
    const top = $('.reader__text').scrollTop
    cite(1).click()
    const box = $('.reader__ref')
    expect(box.hidden).toBe(false)
    expect(box.textContent).toContain('M. Deitke. ProcTHOR.')
    expect(box.querySelector('a').getAttribute('href')).toBe('https://arxiv.org/abs/2206.06994')
    expect(box.querySelector('a').getAttribute('target')).toBe('_blank')
    expect($('.reader__text').scrollTop).toBe(top)
    expect(scrolled).toEqual([])
  })

  it('offers a search when the reference has no link', () => {
    cite(2).click()
    expect($('.reader__ref a').getAttribute('href')).toContain('scholar.google.com')
  })

  it('closes the window from its button, by clicking outside and with Esc, before the reader', () => {
    cite(1).click()
    $('.reader__ref-close').click()
    expect($('.reader__ref').hidden).toBe(true)
    cite(1).click()
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect($('.reader__ref').hidden).toBe(true)
    cite(1).click()
    expect(view.reader.escape()).toBe(true)
    expect($('.reader__ref').hidden).toBe(true)
    expect(view.reader.isOpen()).toBe(true)
  })

  it('does not say the citations', () => {
    play()
    expect(synth.spoken.map((u) => u.text).join(' ')).not.toMatch(/\[\s*\d/)
  })

  it('follows the voice until the reader scrolls by hand, then offers the way back', () => {
    $('.reader__text').scrollTop = 0
    play()
    expect(scrolled.length).toBeGreaterThan(0)
    expect($('.reader__resume').hidden).toBe(true)
    scrolled.length = 0
    $('.reader__text').dispatchEvent(new Event('wheel', { bubbles: true }))
    expect($('.reader__resume').hidden).toBe(false)
    nextSentence()
    expect(scrolled).toEqual([])
    const at = view.reader.element.querySelector('.speaking').closest('[data-block]').dataset.block
    $('.reader__resume').click()
    expect(scrolled).toEqual([at])
    expect($('.reader__resume').hidden).toBe(true)
    scrolled.length = 0
    nextSentence()
    expect(scrolled.length).toBe(1)
  })

  it('a scroll made by the voice itself keeps following, and stopping hides the way back', () => {
    play()
    scrolled.length = 0
    $('.reader__text').dispatchEvent(new Event('scroll'))
    nextSentence()
    expect(scrolled.length).toBe(1)
    $('.reader__text').dispatchEvent(new Event('wheel', { bubbles: true }))
    $('[data-voice="stop"]').click()
    expect($('.reader__resume').hidden).toBe(true)
  })

  it('scrolling with the voice stopped offers nothing, and playing again follows', () => {
    $('.reader__text').dispatchEvent(new Event('wheel', { bubbles: true }))
    expect($('.reader__resume').hidden).toBe(true)
    play()
    $('.reader__text').dispatchEvent(new Event('wheel', { bubbles: true }))
    play()
    expect($('.reader__resume').hidden).toBe(true)
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

  describe('an answer read aloud', () => {
    let synth
    const voices = [{ name: 'Dalia (Natural)', lang: 'es-MX' }, { name: 'Jorge (Natural)', lang: 'es-MX' }]
    const withAnswer = async () => {
      synth = fakeSynth(voices)
      window.speechSynthesis = synth
      window.SpeechSynthesisUtterance = Utterance
      await withClient(fakeClient({ ...emptyReading(), voice: 'Jorge (Natural)', chats: [{ id: 'c1', messages: [{ role: 'assistant', text: 'Primera idea. Segunda idea.' }] }] }))
      await read('sample-a')
      client.save.mockClear()
      $('[data-listen]').click()
    }
    afterEach(() => {
      delete window.speechSynthesis
      delete window.SpeechSynthesisUtterance
    })

    it('uses the voice chosen in the reader, and the reader follows along', async () => {
      await withAnswer()
      expect(synth.spoken.at(-1).text).toBe('Primera idea.')
      expect(synth.spoken.at(-1).voice.name).toBe('Jorge (Natural)')
      expect($('[data-voice="stop"]').disabled).toBe(false)
    })

    it('moves on sentence by sentence, lighting it in the chat and not in the paper', async () => {
      await withAnswer()
      synth.finish()
      expect($('.chat__say.speaking').textContent).toBe('Segunda idea.')
      expect($('.reader__text .speaking')).toBeNull()
    })

    it('is not remembered as the place in the paper', async () => {
      await withAnswer()
      synth.finish()
      expect(client.save).not.toHaveBeenCalled()
    })

    it("the reader's pause and stop reach the chat's button", async () => {
      await withAnswer()
      $('[data-voice="pause"]').click()
      expect($('[data-listen]').textContent).toContain(LABELS.es.resume)
      $('[data-voice="stop"]').click()
      expect($('[data-listen]').textContent).toContain(LABELS.es.listen)
      expect($('.chat__say.speaking')).toBeNull()
    })

    it("the reader's previous and next move by sentence", async () => {
      await withAnswer()
      $('[data-voice="next"]').click()
      expect(synth.spoken.at(-1).text).toBe('Segunda idea.')
      $('[data-voice="prev"]').click()
      expect(synth.spoken.at(-1).text).toBe('Primera idea.')
    })

    it('a language switch leaves the answer going, without starting the paper', async () => {
      await withAnswer()
      const spoken = synth.spoken.length
      view.reader.setLang('en')
      expect(synth.spoken).toHaveLength(spoken)
      expect($('.chat__say.speaking').textContent).toBe('Primera idea.')
    })

    it('reading the paper takes over from the answer', async () => {
      await withAnswer()
      $('[data-voice="play"]').click()
      expect($('.chat__say.speaking')).toBeNull()
      expect($('[data-listen]').textContent).toContain(LABELS.es.listen)
      expect($('.reader__text .speaking')).not.toBeNull()
    })
  })

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
