/*
 * The study companion inside the reader: a chat with one paper or across several, the passages the author attached as
 * chips, the shortcuts (What did they mean here? · Research this · Quiz me, only when asked), answers that cite
 * paragraphs as links, "Save this", which proposes a note entry the author edits and approves, and "Add to the map",
 * which proposes an idea and links for map.json the same way.
 */
import { blocksOf, paraLabel } from './paper.js'
import { answerParts, answerQueue } from './speech.js'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const SCOPES = ['underline', 'section', 'paper', 'papers']

/**
 * Mounts the chat into `el`. `client` is the local server's (reading-client.js); `papers` the prepared papers;
 * `labels` the reader's LABELS; `onCite(blockId)` scrolls the reader to a cited paragraph; `current()` gives
 * `{ nodeId, paper, block }` — the open paper and the paragraph in view. `speaker` is the reader's voice (speech.js),
 * so answers are read with the same voice and speed; without it they are not offered; `onVoice()` reports a change.
 */
export function mountChat(el, { client, papers = [], labels, lang = 'es', onCite = () => {}, current = () => null, speaker = null, onVoice = () => {} }) {
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
      <button type="button" data-mode="underlined"></button>
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

  /** An answer with each of its parts in a span, so the voice can light it and a click can go back to it. */
  function answerHtml(text, i) {
    let html = ''
    let at = 0
    answerParts(text).forEach(({ start, end }, k) => {
      html += `${richText(text.slice(at, start))}<span class="chat__say" data-say="chat-${i}-${k}">${richText(text.slice(start, end))}</span>`
      at = end
    })
    return html + richText(text.slice(at))
  }

  function messageHtml(m, i) {
    const chipsHtml =
      m.mode !== 'underlined'
        ? (m.attach ?? []).map((a) => `<span class="chat__chip">«${esc(a.text)}»</span>`).join('')
        : m.role !== 'user'
          ? ''
          : `<span class="chat__chip">${(m.attach ?? []).length} ${esc(L().underlinedCount)}</span>`
    const voice =
      speaker && m.role === 'assistant'
        ? `<button type="button" class="chat__voice" data-listen="${i}"></button><button type="button" class="chat__voice" data-hush hidden></button>`
        : ''
    return `<div class="chat__msg ${m.role}" data-i="${i}">
      ${chipsHtml}
      <div class="chat__text">${m.role === 'assistant' ? answerHtml(m.text, i) : esc(m.text)}</div>
      <div class="chat__foot">${voice}<button type="button" class="chat__save" data-save="${i}">${esc(L().save)}</button><button type="button" class="chat__save" data-map-add="${i}">${esc(L().addToMap)}</button></div>
    </div>`
  }

  /** Shows what the voice is doing: the sentence lit in its answer, and that answer's button as pause or resume. */
  function paintVoice() {
    if (!speaker) return
    const item = speaker.at()
    const paused = speaker.state() === 'paused'
    for (const msg of log.querySelectorAll('.chat__msg[data-i]')) {
      const on = item?.chat === Number(msg.dataset.i)
      msg.classList.toggle('reading', on)
      const listen = msg.querySelector('[data-listen]')
      if (!listen) continue
      listen.textContent = !on ? `▶ ${L().listen}` : paused ? `▶ ${L().resume}` : `⏸ ${L().pause}`
      const hush = msg.querySelector('[data-hush]')
      hush.hidden = !on
      hush.textContent = `■ ${L().stop}`
    }
    for (const s of log.querySelectorAll('.chat__say.speaking')) if (s.dataset.say !== item?.block) s.classList.remove('speaking')
    if (item?.chat == null) return
    const said = log.querySelector(`[data-say="${item.block}"]`)
    if (said && !said.classList.contains('speaking')) {
      said.classList.add('speaking')
      said.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    }
  }

  /** Stops the voice if it is reading this chat: its messages are about to change. */
  const hush = () => {
    if (speaker?.at()?.chat != null) speaker.stop()
  }

  /** What a click on the voice controls or on a sentence does; true if it was one of those. */
  function voiceClick(t) {
    if (!speaker) return false
    const reading = speaker.at()?.chat
    const listen = t.closest('[data-listen]')
    const say = t.closest('[data-say]')
    if (listen) {
      const i = Number(listen.dataset.listen)
      if (reading !== i) {
        speaker.setLang(lang)
        speaker.play(answerQueue(thread.messages[i].text, i))
      } else if (speaker.state() === 'paused') speaker.resume()
      else speaker.pause()
    } else if (t.closest('[data-hush]')) speaker.stop()
    else if (say && reading === Number(say.closest('[data-i]').dataset.i)) {
      if (!el.ownerDocument.getSelection?.()?.isCollapsed) return false // selecting text to copy it, not going there
      speaker.seek(say.dataset.say)
    } else return false
    paintVoice()
    onVoice()
    return true
  }

  function renderLog() {
    log.innerHTML = (thread?.messages ?? []).map(messageHtml).join('')
    log.scrollTop = log.scrollHeight
    paintVoice()
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
    $('[data-mode="underlined"]').textContent = L().underlined
    $('[data-mode="underlined"]').disabled = conv === '_across' || !underlinesNow().length
    $('[data-quiz]').textContent = L().quiz
    $('.chat__scopes').innerHTML = SCOPES.map((s) => `<button type="button" data-scope="${s}">${esc(L().scopes[s])}</button>`).join('')
    $('.chat__input').placeholder = L().placeholder
    $('.chat__send').textContent = L().send
  }

  /** Everything underlined in the open paper, as the chat sends it. */
  function underlinesNow() {
    return (current()?.underlines ?? []).map((u) => ({ block: u.block, text: u.text, ...(u.image ? { image: true } : {}) }))
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
      attach: mode === 'underlined' ? underlinesNow() : chips,
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
        .then(
          () => {
            // The stream ended without done or error (the connection dropped, the server failed): say so.
            if (!busy) return
            bubble.classList.remove('pending')
            bubble.innerHTML = `<p class="chat__error">${esc(L().noAnswer)} <button type="button" data-retry>${esc(L().retry)}</button></p>`
            resolve()
          },
          (e) => {
            bubble.innerHTML = `<p class="chat__error">${esc(e.message)} <button type="button" data-retry>${esc(L().retry)}</button></p>`
            resolve()
          },
        )
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

  /** Add to the map: a proposed idea and links, every field editable, written to map.json only on Approve. */
  async function draftMap(i) {
    const m = thread?.messages?.[i]
    if (!m) return
    const node = conv === '_across' ? ticked[0] : conv
    const box = document.createElement('div')
    box.className = 'chat__draft chat__mapdraft'
    box.innerHTML = `<p class="chat__status">${esc(L().mapDrafting)}</p>`
    log.querySelector(`[data-i="${i}"]`)?.after(box)
    let draft
    try {
      draft = await client.draftMapEntry({ node, text: m.text, from: m.role === 'user' ? 'author' : 'claude' })
    } catch (e) {
      box.innerHTML = `<p class="chat__error">${esc(e.message)}</p>`
      return
    }
    const { idea, links = [] } = draft.proposal ?? {}
    const groups = draft.groups ?? []
    const problems = (draft.problems ?? []).length
      ? `<p class="chat__error">${esc(L().mapProblems)}</p><ul>${draft.problems.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`
      : ''
    const groupOptions = [...(groups.some((g) => g.id === idea?.group) ? [] : [{ id: idea?.group ?? '', title: idea?.group ?? '' }]), ...groups]
      .map((g) => `<option value="${esc(g.id)}">${esc(g.title)}</option>`)
      .join('')
    const ideaHtml = `<fieldset class="chat__idea">
        <label><input type="checkbox" data-idea-on ${idea ? 'checked' : ''} /> ${esc(L().mapIdea)}</label>
        <label>${esc(L().mapTitle)} <input type="text" data-f="title" /></label>
        <label>${esc(L().mapId)} <input type="text" data-f="id" /></label>
        <label>${esc(L().mapGroup)} <select data-f="group">${groupOptions}</select></label>
        <label>${esc(L().mapNote)} <textarea rows="4" data-f="note"></textarea></label>
      </fieldset>`
    const linkHtml = links
      .map(
        () => `<div class="chat__link"><label><input type="checkbox" data-link-on checked /></label>
          <input type="text" data-lf="from" /> → <input type="text" data-lf="to" />
          <input type="text" data-lf="explanation" placeholder="${esc(L().mapLinkWhy)}" /></div>`,
      )
      .join('')
    box.innerHTML = `${problems}${ideaHtml}<p>${esc(L().mapLinks)}</p>${linkHtml}
      <div><button type="button" data-map-approve>${esc(L().approve)}</button><button type="button" data-discard>${esc(L().discard)}</button></div>`
    const put = (sel, v) => (box.querySelector(sel).value = v ?? '')
    put('[data-f="title"]', idea?.title)
    put('[data-f="id"]', idea?.id)
    put('[data-f="group"]', idea?.group)
    put('[data-f="note"]', idea?.note)
    box.querySelectorAll('.chat__link').forEach((row, k) => {
      for (const f of ['from', 'to', 'explanation']) row.querySelector(`[data-lf="${f}"]`).value = links[k][f] ?? ''
    })
  }

  /** The proposal as the author left it in the form: the idea only when ticked, the links that are ticked. */
  function proposalOf(box) {
    const field = (f) => box.querySelector(`[data-f="${f}"]`).value
    const idea = box.querySelector('[data-idea-on]').checked ? { id: field('id'), title: field('title'), group: field('group'), note: field('note') } : null
    const links = [...box.querySelectorAll('.chat__link')]
      .filter((row) => row.querySelector('[data-link-on]').checked)
      .map((row) => Object.fromEntries(['from', 'to', 'explanation'].map((f) => [f, row.querySelector(`[data-lf="${f}"]`).value])))
    return { idea, links }
  }

  async function approveMap(box) {
    box.querySelector('.chat__error[data-save-error]')?.remove()
    try {
      await client.saveMapEntry({ proposal: proposalOf(box) })
      box.innerHTML = `<p class="chat__saved">${esc(L().mapSaved)} <button type="button" data-reload>${esc(L().mapReload)}</button></p>`
    } catch (e) {
      box.insertAdjacentHTML('beforeend', `<p class="chat__error" data-save-error>${esc(e.message)}</p>`)
    }
  }

  el.addEventListener('click', async (e) => {
    const t = e.target
    if (t.closest('[data-reload]')) return globalThis.location?.reload()
    const cite = t.closest('[data-cite]')
    if (cite) return onCite(cite.dataset.cite)
    if (voiceClick(t)) return
    const c = t.closest('[data-conv]')
    if (c) {
      hush()
      if (c.dataset.conv === 'across') {
        conv = '_across'
        const reading = await client.load('_across').catch(() => null)
        thread = structuredClone(reading?.chats?.at(-1) ?? null)
      } else if (paperConv) {
        conv = paperConv.id
        thread = structuredClone(paperConv.reading?.chats?.at(-1) ?? null)
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
    // Only the chat's own buttons: the reader around it has a data-mode of its own, its size.
    const mode = t.closest('button[data-mode]')
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
    const mapAdd = t.closest('[data-map-add]')
    if (mapAdd) return draftMap(Number(mapAdd.dataset.mapAdd))
    if (t.closest('[data-map-approve]')) return approveMap(t.closest('.chat__draft'))
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
    /** The underlines changed: the shortcut about them turns on or off. */
    refresh: () => renderChrome(),
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
      hush()
      if (nodeId !== '_across') paperConv = { id: nodeId, reading }
      conv = nodeId
      thread = structuredClone(reading?.chats?.at(-1) ?? null) // the reader's reading is not this chat's to change
      chips = []
      renderChrome()
      renderChips()
      renderLog()
    },
    paperOf,
    /** The voice changed (another sentence, or the reader's own controls). */
    refreshVoice: paintVoice,
  }
}
