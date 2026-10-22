/*
 * The study companion inside the reader: a chat with one paper or across several, the passages the author attached as
 * chips, the shortcuts (What did they mean here? · Research this · Quiz me, only when asked), answers that cite
 * paragraphs as links, and "Save this", which proposes a note entry the author edits and approves.
 */
import { blocksOf, paraLabel } from './paper.js'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const SCOPES = ['underline', 'section', 'paper', 'papers']

/**
 * Mounts the chat into `el`. `client` is the local server's (reading-client.js); `papers` the prepared papers;
 * `labels` the reader's LABELS; `onCite(blockId)` scrolls the reader to a cited paragraph; `current()` gives
 * `{ nodeId, paper, block }` — the open paper and the paragraph in view.
 */
export function mountChat(el, { client, papers = [], labels, lang = 'es', onCite = () => {}, current = () => null }) {
  let conv = null // the open paper's id, or '_across'
  let thread = null // { id, messages }
  let model = 'sonnet'
  let chips = []
  let ticked = papers.map((p) => p.node)
  let paperConv = null
  let lastBody = null
  let busy = false
  const L = () => labels[lang]

  el.innerHTML = `
    <div class="chat__head">
      <span class="chat__seg"><button type="button" data-conv="paper"></button><button type="button" data-conv="across"></button></span>
      <span class="chat__seg"><button type="button" data-model="sonnet">Sonnet</button><button type="button" data-model="haiku">Haiku</button></span>
    </div>
    <div class="chat__papers" hidden></div>
    <div class="chat__log" aria-live="polite"></div>
    <div class="chat__chips"></div>
    <div class="chat__acts">
      <button type="button" data-mode="explain"></button>
      <button type="button" data-mode="research"></button>
      <button type="button" data-quiz aria-expanded="false"></button>
      <span class="chat__scopes" hidden></span>
    </div>
    <form class="chat__form"><textarea class="chat__input" rows="2"></textarea><button type="submit" class="chat__send"></button></form>`
  const $ = (sel) => el.querySelector(sel)
  const log = $('.chat__log')

  const paperOf = (id) => (current()?.nodeId === id ? current().paper : null)

  /** An answer's text with its [¶ id] citations as buttons that scroll the reader there. */
  function richText(text) {
    const paper = current()?.paper
    return esc(text)
      .replace(/\[¶\s*([a-z0-9][a-z0-9-]*)\]/g, (_, id) => {
        const label = paper && blocksOf(paper).some((b) => b.id === id) ? paraLabel(paper, id) : id
        return `<button type="button" class="chat__cite" data-cite="${id}">¶ ${esc(label)}</button>`
      })
      .replace(/\n/g, '<br>')
  }

  function messageHtml(m, i) {
    const chipsHtml = (m.attach ?? []).map((a) => `<span class="chat__chip">«${esc(a.text)}»</span>`).join('')
    return `<div class="chat__msg ${m.role}" data-i="${i}">
      ${chipsHtml}
      <div class="chat__text">${m.role === 'assistant' ? richText(m.text) : esc(m.text)}</div>
      <button type="button" class="chat__save" data-save="${i}">${esc(L().save)}</button>
    </div>`
  }

  function renderLog() {
    log.innerHTML = (thread?.messages ?? []).map(messageHtml).join('')
    log.scrollTop = log.scrollHeight
  }

  function renderChips() {
    const paper = current()?.paper
    $('.chat__chips').innerHTML = chips
      .map(
        (c, i) =>
          `<span class="chat__chip">«${esc(c.text.length > 90 ? `${c.text.slice(0, 90)}…` : c.text)}» ${
            paper ? `<b>¶ ${esc(paraLabel(paper, c.block))}</b>` : ''
          }<button type="button" data-unchip="${i}" aria-label="×">×</button></span>`,
      )
      .join('')
  }

  function renderChrome() {
    for (const b of el.querySelectorAll('[data-conv]')) {
      b.textContent = b.dataset.conv === 'paper' ? L().thisPaper : L().across
      b.setAttribute('aria-pressed', String((conv === '_across') === (b.dataset.conv === 'across')))
    }
    for (const b of el.querySelectorAll('[data-model]')) b.setAttribute('aria-pressed', String(b.dataset.model === model))
    const box = $('.chat__papers')
    box.hidden = conv !== '_across'
    box.innerHTML = papers
      .map((p) => `<label><input type="checkbox" value="${esc(p.node)}"${ticked.includes(p.node) ? ' checked' : ''} /> ${esc(p.title)}</label>`)
      .join('')
    $('[data-mode="explain"]').textContent = L().explain
    $('[data-mode="research"]').textContent = L().research
    $('[data-quiz]').textContent = L().quiz
    $('.chat__scopes').innerHTML = SCOPES.map((s) => `<button type="button" data-scope="${s}">${esc(L().scopes[s])}</button>`).join('')
    $('.chat__input').placeholder = L().placeholder
    $('.chat__send').textContent = L().send
  }

  function scopeOf(kind) {
    const now = current()
    if (kind === 'underline') return { kind, ids: chips.map((c) => c.block) }
    if (kind === 'section') {
      const block = chips[0]?.block ?? now?.block
      const section = blocksOf(now?.paper).find((b) => b.id === block)?.section ?? now?.paper?.sections?.[0]?.id
      return { kind, ids: section ? [section] : [] }
    }
    if (kind === 'paper') return { kind, ids: [now?.nodeId].filter(Boolean) }
    return { kind: 'papers', ids: ticked }
  }

  /** One turn: the author's message (or a shortcut), streamed back into the log. */
  async function sendTurn(mode, message, scope = null, body = null) {
    if (busy || !conv) return
    const turn = body ?? {
      conv,
      chatId: thread?.id ?? null,
      papers: conv === '_across' ? ticked : [conv],
      mode,
      scope,
      attach: chips,
      message,
      lang,
      model,
    }
    if (!turn.papers.length) return
    lastBody = turn
    busy = true
    thread = thread ?? { id: null, messages: [] }
    if (!body) thread.messages.push({ role: 'user', mode, text: message, attach: turn.attach })
    chips = []
    renderChips()
    renderLog()
    const bubble = document.createElement('div')
    bubble.className = 'chat__msg assistant pending'
    bubble.innerHTML = '<div class="chat__text"></div>'
    log.append(bubble)
    let streamed = ''
    const done = new Promise((settle) => {
      // The turn is over the moment the server says so: a retry may follow at once.
      const resolve = () => {
        busy = false
        settle()
      }
      client
        .chat(turn, (event, data) => {
          if (event === 'delta') {
            streamed += data.text
            bubble.querySelector('.chat__text').innerHTML = richText(streamed)
          } else if (event === 'status' && data?.phase === 'reread') {
            if (!bubble.querySelector('.chat__status')) bubble.insertAdjacentHTML('afterbegin', `<p class="chat__status">${esc(L().rereading)}</p>`)
          } else if (event === 'done') {
            thread.id = data.chatId ?? thread.id
            thread.messages.push({ role: 'assistant', mode, text: data.text })
            renderLog()
            resolve()
          } else if (event === 'error') {
            bubble.classList.remove('pending')
            bubble.innerHTML = `<p class="chat__error">${esc(data?.message)} <button type="button" data-retry>${esc(L().retry)}</button></p>`
            resolve()
          }
        })
        .then(resolve, (e) => {
          bubble.innerHTML = `<p class="chat__error">${esc(e.message)} <button type="button" data-retry>${esc(L().retry)}</button></p>`
          resolve()
        })
    })
    await done
    log.scrollTop = log.scrollHeight
  }

  /** Save this: a proposed note entry, editable, written only on Approve. */
  async function draft(i) {
    const m = thread?.messages?.[i]
    if (!m) return
    const node = conv === '_across' ? ticked[0] : conv
    const box = document.createElement('div')
    box.className = 'chat__draft'
    box.innerHTML = `<p class="chat__status">${esc(L().drafting)}</p>`
    log.querySelector(`[data-i="${i}"]`)?.after(box)
    let text = ''
    try {
      text = await client.draftNote({ node, text: m.text, from: m.role === 'user' ? 'author' : 'claude' })
    } catch (e) {
      box.innerHTML = `<p class="chat__error">${esc(e.message)}</p>`
      return
    }
    const choices =
      conv === '_across'
        ? `<p>${esc(L().pickNotes)}</p>${ticked
            .map((id) => `<label><input type="checkbox" name="note" value="${esc(id)}" checked /> ${esc(papers.find((p) => p.node === id)?.title ?? id)}</label>`)
            .join('')}`
        : ''
    box.innerHTML = `<textarea rows="6"></textarea>${choices}
      <div><button type="button" data-approve>${esc(L().approve)}</button><button type="button" data-discard>${esc(L().discard)}</button></div>`
    box.querySelector('textarea').value = text
  }

  async function approve(box) {
    const body = box.querySelector('textarea').value
    const nodes = conv === '_across' ? [...box.querySelectorAll('input[name="note"]:checked')].map((c) => c.value) : [conv]
    try {
      await client.saveNote({ nodes, body })
      box.innerHTML = `<p class="chat__saved">${esc(L().saved)}</p>`
    } catch (e) {
      box.insertAdjacentHTML('beforeend', `<p class="chat__error">${esc(e.message)}</p>`)
    }
  }

  el.addEventListener('click', async (e) => {
    const t = e.target
    const cite = t.closest('[data-cite]')
    if (cite) return onCite(cite.dataset.cite)
    const c = t.closest('[data-conv]')
    if (c) {
      if (c.dataset.conv === 'across') {
        conv = '_across'
        const reading = await client.load('_across').catch(() => null)
        thread = reading?.chats?.at(-1) ?? null
      } else if (paperConv) {
        conv = paperConv.id
        thread = paperConv.reading?.chats?.at(-1) ?? null
      }
      renderChrome()
      return renderLog()
    }
    const m = t.closest('[data-model]')
    if (m) {
      model = m.dataset.model
      return renderChrome()
    }
    const un = t.closest('[data-unchip]')
    if (un) {
      chips.splice(Number(un.dataset.unchip), 1)
      return renderChips()
    }
    const mode = t.closest('[data-mode]')
    if (mode) return sendTurn(mode.dataset.mode, $('.chat__input').value.trim() || L()[mode.dataset.mode])
    if (t.closest('[data-quiz]')) {
      const open = $('.chat__scopes').hidden
      $('.chat__scopes').hidden = !open
      return $('[data-quiz]').setAttribute('aria-expanded', String(open))
    }
    const scope = t.closest('[data-scope]')
    if (scope) {
      $('.chat__scopes').hidden = true
      return sendTurn('quiz', `${L().quiz.replace(' ▾', '')} — ${L().scopes[scope.dataset.scope]}`, scopeOf(scope.dataset.scope))
    }
    if (t.closest('[data-retry]')) {
      const body = lastBody
      if (body) {
        t.closest('.chat__msg')?.remove()
        return sendTurn(body.mode, body.message, body.scope, body)
      }
    }
    const save = t.closest('[data-save]')
    if (save) return draft(Number(save.dataset.save))
    if (t.closest('[data-approve]')) return approve(t.closest('.chat__draft'))
    if (t.closest('[data-discard]')) return t.closest('.chat__draft').remove()
  })

  el.addEventListener('change', (e) => {
    if (!e.target.closest('.chat__papers')) return
    ticked = [...el.querySelectorAll('.chat__papers input:checked')].map((i) => i.value)
  })
  el.addEventListener('submit', (e) => {
    e.preventDefault()
    const input = $('.chat__input')
    const text = input.value.trim()
    if (!text) return
    input.value = ''
    sendTurn('ask', text)
  })
  $('.chat__input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      $('.chat__form').requestSubmit?.() ?? $('.chat__form').dispatchEvent(new Event('submit', { cancelable: true }))
    }
  })

  renderChrome()

  return {
    /** A passage the author attached (from an underline or a selection). */
    attach({ block, text }) {
      chips.push({ block, text })
      renderChips()
      $('.chat__input').focus()
    },
    setLang(l) {
      lang = l
      renderChrome()
      renderChips()
      renderLog()
    },
    /** Shows the chat of paper `nodeId` (its last thread from `reading`), or the across-papers one. */
    setConversation(nodeId, reading = null) {
      if (nodeId !== '_across') paperConv = { id: nodeId, reading }
      conv = nodeId
      thread = reading?.chats?.at(-1) ?? null
      chips = []
      renderChrome()
      renderChips()
      renderLog()
    },
    paperOf,
  }
}
