import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountChat } from '../assets/chat-ui.js'
import { LABELS } from '../assets/reader-ui.js'
import { emptyReading } from '../assets/reading.js'

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

describe('the chat', () => {
  it('sends nothing on its own', () => expect(client.chat).not.toHaveBeenCalled())

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
