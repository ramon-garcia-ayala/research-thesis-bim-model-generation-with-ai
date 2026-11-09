import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountChat } from '../assets/chat-ui.js'
import { LABELS } from '../assets/reader-ui.js'
import { emptyReading } from '../assets/reading.js'
import { createSpeaker } from '../assets/speech.js'
import { Utterance, fakeSynth } from './fake-speech.js'

const paper = JSON.parse(readFileSync(join(import.meta.dirname, 'fixture/papers/sample-a/paper.json'), 'utf8'))
const papers = [
  { node: 'sample-a', title: 'Sample paper A', figures: 1, es: false, graph: true },
  { node: 'sample-b', title: 'Sample paper B', figures: 0, es: false, graph: true },
]

let el
let chat
let client
let onCite
let emitter // the event callback of the chat call in flight
let finish // ends that call

const $ = (sel) => el.querySelector(sel)
const click = async (sel) => {
  $(sel).click()
  await Promise.resolve()
  await Promise.resolve()
}
const emit = (event, data) => emitter(event, data)
const type = (sel, text) => {
  $(sel).value = text
  $(sel).dispatchEvent(new Event('input', { bubbles: true }))
}
const send = async (text) => {
  type('.chat__input', text)
  $('.chat__form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await Promise.resolve()
}

beforeEach(() => {
  document.body.innerHTML = '<div class="reader__chat"></div>'
  el = document.querySelector('.reader__chat')
  client = {
    chat: vi.fn((body, onEvent) => {
      emitter = onEvent
      return new Promise((resolve) => (finish = resolve))
    }),
    draftNote: vi.fn(async () => 'Author: "x"'),
    saveNote: vi.fn(async () => {}),
    load: vi.fn(async () => emptyReading()),
  }
  onCite = vi.fn()
  chat = mountChat(el, { client, papers, labels: LABELS, lang: 'es', onCite, current: () => ({ nodeId: 'sample-a', paper, block: 's2-p1' }) })
  chat.setConversation('sample-a', emptyReading())
})

describe('asking about what was underlined', () => {
  const underlines = [
    { id: 'u1', block: 's1-p1', lang: 'es', start: 0, end: 5, text: 'Embodied', date: '2026-11-08' },
    { id: 'u2', block: 'fig-1', lang: 'es', start: 0, end: 8, text: 'Figure 1', date: '2026-11-08', image: true },
  ]
  const withUnderlines = (list) => {
    document.body.innerHTML = '<div class="reader__chat"></div>'
    el = document.querySelector('.reader__chat')
    chat = mountChat(el, { client, papers, labels: LABELS, lang: 'es', onCite, current: () => ({ nodeId: 'sample-a', paper, block: 's1-p1', underlines: list }) })
    chat.setConversation('sample-a', emptyReading())
  }

  it('sends every underline of the paper, the image ones marked', async () => {
    withUnderlines(underlines)
    await click('[data-mode="underlined"]')
    expect(client.chat.mock.calls.at(-1)[0]).toMatchObject({
      mode: 'underlined',
      message: LABELS.es.underlined,
      attach: [{ block: 's1-p1', text: 'Embodied' }, { block: 'fig-1', text: 'Figure 1', image: true }],
    })
  })

  it('takes the question typed in the box', async () => {
    withUnderlines(underlines)
    type('.chat__input', '¿Qué los une?')
    await click('[data-mode="underlined"]')
    expect(client.chat.mock.calls.at(-1)[0].message).toBe('¿Qué los une?')
  })

  it('shows how many went, not their whole text', async () => {
    withUnderlines(underlines)
    await click('[data-mode="underlined"]')
    expect($('.chat__log').textContent).toContain(`2 ${LABELS.es.underlinedCount}`)
    expect($('.chat__log').textContent).not.toContain('«Embodied»')
  })

  it('counts them on the question only, not on the answer', () => {
    withUnderlines(underlines)
    const thread = {
      id: 'c1',
      messages: [
        { role: 'user', mode: 'underlined', text: 'Sobre lo subrayado', attach: [{ block: 's1-p1', text: 'Embodied' }], date: '2026-11-08' },
        { role: 'assistant', mode: 'underlined', text: 'Respuesta', date: '2026-11-08' },
      ],
    }
    chat.setConversation('sample-a', { ...emptyReading(), chats: [thread] })
    expect([...el.querySelectorAll('.chat__log .chat__chip')].map((c) => c.textContent)).toEqual([`1 ${LABELS.es.underlinedCount}`])
  })

  it('is off with nothing underlined, and on after refresh', () => {
    const list = []
    withUnderlines(list)
    expect($('[data-mode="underlined"]').disabled).toBe(true)
    list.push(underlines[0])
    chat.refresh()
    expect($('[data-mode="underlined"]').disabled).toBe(false)
  })
})

describe('listening to an answer', () => {
  const answer = 'Primera idea [¶ s2-p1]. Segunda idea. Tercera idea.'
  let synth
  let onVoice
  let speaker

  beforeEach(() => {
    synth = fakeSynth()
    onVoice = vi.fn()
    speaker = createSpeaker({ synth, Utterance })
    document.body.innerHTML = '<div class="reader__chat"></div>'
    el = document.querySelector('.reader__chat')
    chat = mountChat(el, { client, papers, labels: LABELS, lang: 'es', onCite, speaker, onVoice, current: () => ({ nodeId: 'sample-a', paper, block: 's2-p1' }) })
    chat.setConversation('sample-a', {
      ...emptyReading(),
      chats: [{ id: 'c1', messages: [{ role: 'user', text: '¿Qué valida?' }, { role: 'assistant', text: answer }] }],
    })
  })

  it('offers it on answers only', () => {
    expect($('.chat__msg.user [data-listen]')).toBeNull()
    expect($('.chat__msg.assistant [data-listen]').textContent).toContain(LABELS.es.listen)
  })

  it('offers nothing without a voice', () => {
    chat = mountChat(el, { client, papers, labels: LABELS, lang: 'es', onCite, current: () => null })
    chat.setConversation('sample-a', { ...emptyReading(), chats: [{ id: 'c1', messages: [{ role: 'assistant', text: answer }] }] })
    expect($('[data-listen]')).toBeNull()
  })

  it('reads the answer sentence by sentence, in the chat language, lighting the one being said', async () => {
    const setLang = vi.spyOn(speaker, 'setLang')
    await click('[data-listen]')
    expect(setLang).toHaveBeenCalledWith('es')
    expect(synth.spoken[0].text).toBe('Primera idea.')
    expect(onVoice).toHaveBeenCalled()
    expect($('.chat__say.speaking').textContent).toContain('Primera idea')
    synth.finish()
    chat.refreshVoice()
    expect($('.chat__say.speaking').textContent).toBe('Segunda idea.')
  })

  it('the same button pauses and resumes, and stop ends it', async () => {
    await click('[data-listen]')
    expect($('[data-listen]').textContent).toContain(LABELS.es.pause)
    expect($('[data-hush]').hidden).toBe(false)
    await click('[data-listen]')
    expect(synth.cancel).toHaveBeenCalled()
    expect($('[data-listen]').textContent).toContain(LABELS.es.resume)
    expect($('.chat__say.speaking').textContent).toContain('Primera idea')
    const said = synth.spoken.length
    await click('[data-listen]')
    expect(synth.spoken).toHaveLength(said + 1)
    expect($('[data-listen]').textContent).toContain(LABELS.es.pause)
    await click('[data-hush]')
    expect(speaker.state()).toBe('idle')
    expect($('[data-hush]').hidden).toBe(true)
    expect($('.chat__say.speaking')).toBeNull()
  })

  it('clicking a sentence while it reads goes there; a click when nothing is read does nothing', async () => {
    const third = () => el.querySelector('[data-say="chat-1-2"]')
    third().click()
    expect(synth.speak).not.toHaveBeenCalled()
    await click('[data-listen]')
    third().click()
    expect(synth.spoken.at(-1).text).toBe('Tercera idea.')
    expect($('.chat__say.speaking').textContent).toBe('Tercera idea.')
    el.querySelector('[data-say="chat-1-0"]').click()
    expect(synth.spoken.at(-1).text).toBe('Primera idea.')
  })

  it('a citation inside a sentence still cites, and does not move the voice', async () => {
    await click('[data-listen]')
    synth.finish()
    await click('.chat__cite')
    expect(onCite).toHaveBeenCalledWith('s2-p1')
    expect(synth.spoken.at(-1).text).toBe('Segunda idea.')
  })

  it('stops when the conversation changes', async () => {
    await click('[data-listen]')
    chat.setConversation('sample-b', emptyReading())
    expect(speaker.state()).toBe('idle')
  })

  it('keeps the lit sentence after the log is drawn again', async () => {
    await click('[data-listen]')
    chat.setLang('en')
    expect($('.chat__say.speaking').textContent).toContain('Primera idea')
    expect($('[data-listen]').textContent).toContain(LABELS.en.pause)
  })
})

describe('the chat', () => {
  it('sends nothing on its own', () => expect(client.chat).not.toHaveBeenCalled())

  it('a click in the chat sends nothing, inside a reader that has its own data-mode', async () => {
    const reader = document.createElement('section')
    reader.dataset.mode = 'full'
    el.replaceWith(reader)
    reader.append(el)
    $('.chat__input').click()
    el.click()
    await Promise.resolve()
    expect(client.chat).not.toHaveBeenCalled()
  })

  it('asks a free question about this paper with Sonnet', async () => {
    await send('¿Qué valida?')
    expect(client.chat.mock.calls[0][0]).toMatchObject({ conv: 'sample-a', papers: ['sample-a'], mode: 'ask', message: '¿Qué valida?', lang: 'es', model: 'sonnet', attach: [] })
  })

  it('Ask attaches the selection as a chip', () => {
    chat.attach({ block: 's2-p1', text: 'Un validador revisa cada casa' })
    expect($('.chat__chips').textContent).toContain('Un validador revisa cada casa')
    expect($('.chat__chips').textContent).toContain('¶ 2.1')
  })

  it('What did they mean here sends explain with the chip', async () => {
    chat.attach({ block: 's2-p1', text: 'Un validador' })
    await click('[data-mode="explain"]')
    expect(client.chat.mock.calls[0][0]).toMatchObject({ mode: 'explain', attach: [{ block: 's2-p1', text: 'Un validador' }] })
    expect($('.chat__chips').children).toHaveLength(0)
  })

  it('Research this sends research', async () => {
    chat.attach({ block: 's2-p1', text: 'x' })
    await click('[data-mode="research"]')
    expect(client.chat.mock.calls[0][0]).toMatchObject({ mode: 'research' })
  })

  it('streams the answer and turns citations into links that scroll', async () => {
    await send('x')
    emit('delta', { text: 'Ver ' })
    emit('delta', { text: '[¶ s2-p2]' })
    expect($('.chat__msg.assistant').textContent).toContain('Ver')
    emit('done', { chatId: 'c1', text: 'Ver [¶ s2-p2]', cites: ['s2-p2'], graphAdded: 0 })
    finish()
    await click('button[data-cite="s2-p2"]')
    expect(onCite).toHaveBeenCalledWith('s2-p2')
    expect($('button[data-cite="s2-p2"]').textContent).toBe('¶ 2.2')
  })

  it('continues the same chat', async () => {
    await send('uno')
    emit('done', { chatId: 'c7', text: 'A', cites: [], graphAdded: 0 })
    finish()
    await Promise.resolve()
    await send('dos')
    expect(client.chat.mock.calls[1][0].chatId).toBe('c7')
  })

  it('says when it reads the paper again', async () => {
    await send('x')
    emit('status', { phase: 'reread' })
    expect($('.chat__status').textContent).toBe(LABELS.es.rereading)
    emit('done', { chatId: 'c1', text: 'Sí', cites: [], graphAdded: 1 })
    expect($('.chat__status')).toBeNull()
  })

  it('quizzes only when asked, on the chosen scope', async () => {
    chat.attach({ block: 's2-p1', text: 'x' })
    await click('[data-quiz]')
    expect(client.chat).not.toHaveBeenCalled()
    await click('[data-scope="section"]')
    expect(client.chat.mock.calls[0][0]).toMatchObject({ mode: 'quiz', scope: { kind: 'section', ids: ['s2'] } })
  })

  it('across papers sends the ticked papers to _across', async () => {
    await click('[data-conv="across"]')
    expect(client.load).toHaveBeenCalledWith('_across')
    await Promise.resolve()
    $('.chat__papers input[value="sample-b"]').click()
    await send('compara')
    expect(client.chat.mock.calls[0][0]).toMatchObject({ conv: '_across', papers: ['sample-a'] })
  })

  it('Haiku is sent when chosen', async () => {
    await click('[data-model="haiku"]')
    await send('x')
    expect(client.chat.mock.calls[0][0].model).toBe('haiku')
  })

  it('Save this drafts, lets the author edit, and saves only on Approve', async () => {
    await send('Lo entendí así')
    emit('done', { chatId: 'c1', text: 'Bien', cites: [], graphAdded: 0 })
    finish()
    await click('.chat__msg.user [data-save]')
    await Promise.resolve()
    expect(client.draftNote).toHaveBeenCalledWith({ node: 'sample-a', text: 'Lo entendí así', from: 'author' })
    type('.chat__draft textarea', 'Author: "x"\nClaude: y')
    expect(client.saveNote).not.toHaveBeenCalled()
    await click('[data-approve]')
    expect(client.saveNote).toHaveBeenCalledWith({ nodes: ['sample-a'], body: 'Author: "x"\nClaude: y' })
    expect(el.textContent).toContain(LABELS.es.saved)
  })

  describe('Add to the map', () => {
    const proposal = {
      idea: { id: 'rules-need-a-reader', title: 'Rules need a reader', group: 'rules', note: 'Author: "x"' },
      links: [
        { from: 'rules-need-a-reader', to: 'sample-a', explanation: 'Read in this paper.' },
        { from: 'rules-need-a-reader', to: 'hypothesis', explanation: 'Bears on it.' },
      ],
    }
    const groups = [{ id: 'datasets', title: 'Datasets' }, { id: 'rules', title: 'Rule-based' }]
    const drafted = async (problems = []) => {
      client.draftMapEntry = vi.fn(async () => ({ proposal, problems, groups }))
      client.saveMapEntry = vi.fn(async () => ({ ok: true, idea: 'rules-need-a-reader', links: 2 }))
      await send('Las reglas necesitan un lector')
      emit('done', { chatId: 'c1', text: 'Bien', cites: [], graphAdded: 0 })
      finish()
      await click('.chat__msg.user [data-map-add]')
      await Promise.resolve()
    }

    it('drafts a proposal and shows every field editable, writing nothing yet', async () => {
      await drafted()
      expect(client.draftMapEntry).toHaveBeenCalledWith({ node: 'sample-a', text: 'Las reglas necesitan un lector', from: 'author' })
      expect($('[data-f="title"]').value).toBe('Rules need a reader')
      expect($('[data-f="group"]').value).toBe('rules')
      expect($('[data-f="note"]').value).toBe('Author: "x"')
      expect(el.querySelectorAll('.chat__link')).toHaveLength(2)
      expect(el.querySelectorAll('.chat__link')[1].querySelector('[data-lf="to"]').value).toBe('hypothesis')
      expect(client.saveMapEntry).not.toHaveBeenCalled()
    })

    it('writes what the author left in the form on Approve, without the links unticked', async () => {
      await drafted()
      type('[data-f="title"]', 'Rules need a human reader')
      el.querySelectorAll('[data-link-on]')[1].checked = false
      el.querySelectorAll('.chat__link')[0].querySelector('[data-lf="explanation"]').value = 'Edited.'
      await click('[data-map-approve]')
      await Promise.resolve()
      expect(client.saveMapEntry).toHaveBeenCalledWith({
        proposal: {
          idea: { id: 'rules-need-a-reader', title: 'Rules need a human reader', group: 'rules', note: 'Author: "x"' },
          links: [{ from: 'rules-need-a-reader', to: 'sample-a', explanation: 'Edited.' }],
        },
      })
      expect(el.textContent).toContain(LABELS.es.mapSaved)
      expect($('[data-reload]')).not.toBeNull()
    })

    it('sends links alone when the idea is unticked', async () => {
      await drafted()
      $('[data-idea-on]').checked = false
      await click('[data-map-approve]')
      await Promise.resolve()
      expect(client.saveMapEntry.mock.calls[0][0].proposal.idea).toBeNull()
    })

    it('lists the problems of the draft and keeps the form when the server refuses', async () => {
      await drafted(['link a→b: "b" is not a node, a group or the centre'])
      expect(el.textContent).toContain(LABELS.es.mapProblems)
      expect(el.textContent).toContain('"b" is not a node')
      client.saveMapEntry = vi.fn(async () => { throw new Error('duplicate id "x"') })
      await click('[data-map-approve]')
      await Promise.resolve()
      await Promise.resolve()
      expect($('.chat__mapdraft .chat__error[data-save-error]').textContent).toContain('duplicate id')
      expect($('[data-f="title"]')).not.toBeNull()
    })

    it('shows the error when the draft fails, and Discard drops the form', async () => {
      client.draftMapEntry = vi.fn(async () => { throw new Error('Claude did not answer with a proposal') })
      await send('x')
      emit('done', { chatId: 'c1', text: 'Bien', cites: [], graphAdded: 0 })
      await click('.chat__msg.assistant [data-map-add]')
      await Promise.resolve()
      await Promise.resolve()
      expect($('.chat__mapdraft .chat__error').textContent).toContain('did not answer')
    })
  })

  it('Discard drops the draft', async () => {
    await send('x')
    emit('done', { chatId: 'c1', text: 'Bien', cites: [], graphAdded: 0 })
    await click('.chat__msg.assistant [data-save]')
    await Promise.resolve()
    await click('[data-discard]')
    expect($('.chat__draft')).toBeNull()
    expect(client.saveNote).not.toHaveBeenCalled()
  })

  it('shows an error and offers retry', async () => {
    await send('x')
    emit('error', { message: 'claude: Not logged in' })
    finish()
    expect($('.chat__error').textContent).toContain('Not logged in')
    await click('[data-retry]')
    expect(client.chat).toHaveBeenCalledTimes(2)
    expect(client.chat.mock.calls[1][0].message).toBe('x')
  })

  it('leaves the reading it was given untouched', async () => {
    const reading = { ...emptyReading(), chats: [{ id: 'c1', papers: ['sample-a'], messages: [{ role: 'user', mode: 'ask', text: 'Uno', date: '2026-10-22' }] }] }
    chat.setConversation('sample-a', reading)
    await send('dos')
    expect(reading.chats[0].messages).toHaveLength(1)
  })

  it('shows an error and retry when the answer stops without an end', async () => {
    await send('x')
    finish()
    await Promise.resolve()
    await Promise.resolve()
    expect($('.chat__error')).not.toBeNull()
    expect($('[data-retry]')).not.toBeNull()
  })

  it('shows the stored transcript', () => {
    const reading = { ...emptyReading(), chats: [{ id: 'c1', papers: ['sample-a'], messages: [
      { role: 'user', mode: 'ask', text: 'Pregunta', date: '2026-10-22' },
      { role: 'assistant', mode: 'ask', text: 'Respuesta [¶ s2-p1]', date: '2026-10-22' },
    ] }] }
    chat.setConversation('sample-a', reading)
    expect($('.chat__log').textContent).toContain('Pregunta')
    expect($('button[data-cite="s2-p1"]')).not.toBeNull()
  })
})
