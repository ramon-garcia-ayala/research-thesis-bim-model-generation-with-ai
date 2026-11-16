/*
 * The reader's side of the local server's API: the reading state (loaded, and saved a moment after the last change),
 * the chat (a stream of server-sent events) and the note entries. Without the server, `available()` is false and the
 * reader keeps to text, figures and voice.
 */

/** Complete events in `buffer` ("event: x\ndata: {json}\n\n"), and the unfinished rest to prepend to the next chunk. */
export function parseSSE(buffer) {
  const parts = buffer.split('\n\n')
  const rest = parts.pop()
  const events = []
  for (const part of parts) {
    let event = 'message'
    let data = ''
    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data += line.slice(5).trim()
    }
    try {
      events.push({ event, data: data ? JSON.parse(data) : null })
    } catch {
      // a malformed event is skipped
    }
  }
  return { events, rest }
}

/** The client of the server that served the page; `wait` is how long a save waits for more changes. */
export function createClient({ fetch = (...a) => globalThis.fetch(...a), wait = 800, onSaveError = () => {} } = {}) {
  const pending = new Map() // id → the last reading to save
  let timer = null
  const json = (body) => ({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const post = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const errorOf = async (r) => (await r.json().catch(() => null))?.error ?? `the server answered ${r.status}`

  async function flush() {
    clearTimeout(timer)
    timer = null
    const jobs = [...pending].map(async ([id, reading]) => {
      try {
        const r = await fetch(`api/state/${encodeURIComponent(id)}`, json(reading))
        if (!r.ok) onSaveError(await errorOf(r))
      } catch (e) {
        onSaveError(e.message)
      }
    })
    pending.clear()
    await Promise.all(jobs)
  }

  return {
    async available() {
      try {
        const r = await fetch('api/health')
        return r.ok && (await r.json())?.ok === true
      } catch {
        return false
      }
    },
    async load(id) {
      const r = await fetch(`api/state/${encodeURIComponent(id)}`)
      if (!r.ok) throw new Error(await errorOf(r))
      return r.json()
    },
    save(id, reading) {
      pending.set(id, reading)
      clearTimeout(timer)
      timer = setTimeout(flush, wait)
    },
    flush,
    /** Sends one chat turn; `onEvent(event, data)` gets delta, status, done or error. */
    async chat(body, onEvent) {
      let r
      try {
        r = await fetch('api/chat', post(body))
      } catch (e) {
        return onEvent('error', { message: e.message })
      }
      if (!r.ok) return onEvent('error', { message: await errorOf(r) })
      const reader = r.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        const parsed = parseSSE(buffer + decoder.decode(value, { stream: true }))
        buffer = parsed.rest
        for (const e of parsed.events) onEvent(e.event, e.data)
      }
    },
    /** What is marked as read and what is queued: { version, read: { id: date }, queue: { id: 'first' | 'later' }, progress }. */
    async library() {
      const r = await fetch('api/library')
      if (!r.ok) throw new Error(await errorOf(r))
      return r.json()
    },
    async setRead(id, read) {
      const r = await fetch(`api/library/${encodeURIComponent(id)}`, json({ read }))
      if (!r.ok) throw new Error(await errorOf(r))
    },
    /** Marks a paper to read 'first' or 'later', or clears the marker with null. */
    async setQueue(id, level) {
      const r = await fetch(`api/library/${encodeURIComponent(id)}`, json({ queue: level }))
      if (!r.ok) throw new Error(await errorOf(r))
    },
    async draftNote(body) {
      const r = await fetch('api/note-draft', post(body))
      if (!r.ok) throw new Error(await errorOf(r))
      return (await r.json()).draft
    },
    async saveNote(body) {
      const r = await fetch('api/note', post(body))
      if (!r.ok) throw new Error(await errorOf(r))
    },
    /** A proposed change to the map from a chat message: { proposal: { idea, links }, problems, groups }. */
    async draftMapEntry(body) {
      const r = await fetch('api/map-draft', post(body))
      if (!r.ok) throw new Error(await errorOf(r))
      return r.json()
    },
    /** Writes an approved proposal into map.json; the server refuses one that would leave the map invalid. */
    async saveMapEntry(body) {
      const r = await fetch('api/map-entry', post(body))
      if (!r.ok) throw new Error(await errorOf(r))
      return r.json()
    },
  }
}
