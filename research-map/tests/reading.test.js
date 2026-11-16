import { describe, expect, it, vi } from 'vitest'
import { createClient, parseSSE } from '../assets/reading-client.js'
import { addUnderline, emptyReading, furthestBlock, progressOf, removeUnderline, resetProgress, segments, validateReading } from '../assets/reading.js'

describe('the reading state', () => {
  it('starts empty, in Spanish', () => {
    const r = emptyReading()
    expect(r).toEqual({ version: 1, position: null, reached: null, lang: 'es', voice: null, rate: 1, underlines: [], chats: [] })
    expect(validateReading(r)).toEqual([])
  })

  it('cuts text into runs around overlapping underlines', () =>
    expect(segments('abcdefgh', [{ start: 2, end: 5, id: 'u1' }, { start: 4, end: 7, id: 'u2' }])).toEqual([
      { text: 'ab', ids: [] },
      { text: 'cd', ids: ['u1'] },
      { text: 'e', ids: ['u1', 'u2'] },
      { text: 'fg', ids: ['u2'] },
      { text: 'h', ids: [] },
    ]))

  it('leaves text without underlines whole', () => expect(segments('abc', [])).toEqual([{ text: 'abc', ids: [] }]))

  it('adds and removes underlines', () => {
    const fig = addUnderline(emptyReading(), { block: 'fig-1', lang: 'es', start: 0, end: 5, text: 'Fig 1', image: true }, '2026-10-22')
    expect(fig.underlines[0].image).toBe(true)
    expect(validateReading(fig)).toEqual([])
    let r = addUnderline(emptyReading(), { block: 's2-p1', lang: 'es', start: 0, end: 5, text: 'Un va' }, '2026-10-22')
    r = addUnderline(r, { block: 's2-p2', lang: 'en', start: 2, end: 9, text: 'house t' }, '2026-10-22')
    expect(r.underlines[0]).not.toHaveProperty('image')
    expect(r.underlines.map((u) => u.id)).toEqual(['u1', 'u2'])
    expect(r.underlines[0]).toEqual({ id: 'u1', block: 's2-p1', lang: 'es', start: 0, end: 5, text: 'Un va', date: '2026-10-22' })
    r = removeUnderline(r, 'u1')
    r = addUnderline(r, { block: 's1-p1', lang: 'es', start: 0, end: 1, text: 'E' }, '2026-10-23')
    expect(r.underlines.map((u) => u.id)).toEqual(['u2', 'u3'])
  })

  it('names an underline with start after end', () => {
    const r = { ...emptyReading(), underlines: [{ id: 'u1', block: 's2-p1', lang: 'es', start: 9, end: 3, text: 'x', date: '2026-10-22' }] }
    expect(validateReading(r)).toContain('underline "u1": start is after end')
  })

  it('names a chat message with an unknown role', () => {
    const r = { ...emptyReading(), chats: [{ id: 'c1', papers: ['a'], messages: [{ role: 'system', text: 'x', date: '2026-10-22' }] }] }
    expect(validateReading(r)).toContain('chat "c1": message 1 has role "system"')
  })
})

describe('server-sent events', () => {
  it('reads server-sent events across chunk boundaries', () => {
    const a = parseSSE('event: delta\ndata: {"text":"ho"}\n\nevent: del')
    expect(a.events).toEqual([{ event: 'delta', data: { text: 'ho' } }])
    expect(parseSSE(a.rest + 'ta\ndata: {"text":"la"}\n\n').events[0].data.text).toBe('la')
  })
})

describe('the client', () => {
  const ok = (data) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) })

  it('knows when the server is not there', async () => {
    expect(await createClient({ fetch: () => Promise.reject(new Error('refused')) }).available()).toBe(false)
    expect(await createClient({ fetch: () => ok({ ok: true }) }).available()).toBe(true)
  })

  it('saves once, the last state, after a pause', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn(() => ok({ ok: true }))
    const client = createClient({ fetch, wait: 800 })
    client.save('procthor-2022', { n: 1 })
    client.save('procthor-2022', { n: 2 })
    expect(fetch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(800)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('api/state/procthor-2022')
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'PUT', headers: { 'Content-Type': 'application/json' } })
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ n: 2 })
    vi.useRealTimers()
  })

  it('reports a save the server refused', async () => {
    const onSaveError = vi.fn()
    const fetch = vi.fn(() => Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ error: 'lang "fr" is not en or es' }) }))
    const client = createClient({ fetch, wait: 10000, onSaveError })
    client.save('a', { n: 1 })
    await client.flush()
    expect(onSaveError).toHaveBeenCalledWith('lang "fr" is not en or es')
  })

  it('flushes a pending save at once', async () => {
    const fetch = vi.fn(() => ok({ ok: true }))
    const client = createClient({ fetch, wait: 10000 })
    client.save('a', { n: 1 })
    await client.flush()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('streams a chat as events', async () => {
    const body = new ReadableStream({
      start(c) {
        const enc = new TextEncoder()
        c.enqueue(enc.encode('event: delta\ndata: {"text":"Ho"}\n\nevent: de'))
        c.enqueue(enc.encode('lta\ndata: {"text":"la"}\n\nevent: done\ndata: {"text":"Hola"}\n\n'))
        c.close()
      },
    })
    const client = createClient({ fetch: () => Promise.resolve({ ok: true, status: 200, body }) })
    const seen = []
    await client.chat({ message: 'x' }, (event, data) => seen.push([event, data]))
    expect(seen).toEqual([['delta', { text: 'Ho' }], ['delta', { text: 'la' }], ['done', { text: 'Hola' }]])
  })

  it('reports a failed request as an error event', async () => {
    const client = createClient({ fetch: () => Promise.resolve({ ok: false, status: 403, json: () => Promise.resolve({ error: 'forbidden' }) }) })
    const seen = []
    await client.chat({}, (event, data) => seen.push([event, data]))
    expect(seen).toEqual([['error', { message: 'forbidden' }]])
  })
})

describe('reading progress', () => {
  // Body: s1-p1 (10), s1-p2 (30), s2-p1 (60); then the references, which are not counted.
  const text = (n) => ({ en: 'x'.repeat(n) })
  const paper = {
    version: 1, node: 'x', title: 'X', source: 'files/x.pdf',
    sections: [
      { id: 's1', title: { en: 'One' }, blocks: [{ id: 's1-p1', type: 'paragraph', page: 1, text: text(10) }, { id: 's1-p2', type: 'paragraph', page: 1, text: text(30) }] },
      { id: 's2', title: { en: 'Two' }, blocks: [{ id: 's2-p1', type: 'paragraph', page: 2, text: text(60) }] },
      { id: 'refs', title: { en: 'References' }, blocks: [{ id: 'refs-1', type: 'paragraph', page: 3, text: text(500) }] },
    ],
  }
  const at = (block, reached) => ({ ...emptyReading(), position: block ? { block, sentence: 0 } : null, reached })

  it('is 0 before anything is read, and for a block the paper does not have', () => {
    expect(progressOf(paper, emptyReading())).toBe(0)
    expect(progressOf(paper, at('nowhere', null))).toBe(0)
  })

  it('is the share of the text up to and including the block reached, by length', () => {
    expect(progressOf(paper, at('s1-p1', null))).toBe(10)
    expect(progressOf(paper, at('s1-p2', null))).toBe(40)
    expect(progressOf(paper, at('s2-p1', null))).toBe(100)
  })

  it('is 100 once the references are reached, since the body is over', () => {
    expect(progressOf(paper, at('refs-1', null))).toBe(100)
  })

  it('goes by the furthest block reached, so going back to re-read takes nothing away', () => {
    expect(progressOf(paper, at('s1-p1', 's1-p2'))).toBe(40)
  })

  it('tells which of two blocks is further', () => {
    expect(furthestBlock(paper, 's1-p1', 's2-p1')).toBe('s2-p1')
    expect(furthestBlock(paper, 's2-p1', 's1-p1')).toBe('s2-p1')
    expect(furthestBlock(paper, null, 's1-p2')).toBe('s1-p2')
    expect(furthestBlock(paper, 's1-p2', 'nowhere')).toBe('s1-p2')
    expect(furthestBlock(paper, null, null)).toBeNull()
  })

  it('goes back to 0 when the place and the furthest block are forgotten, and keeps the rest of the reading', () => {
    const read = { ...at('s2-p1', 's2-p1'), lang: 'en', rate: 1.5, underlines: [{ id: 'u1', block: 's1-p1', lang: 'en', start: 0, end: 3, text: 'xxx', date: '2026-11-15' }] }
    expect(progressOf(paper, read)).toBe(100)
    const again = resetProgress(read)
    expect(progressOf(paper, again)).toBe(0)
    expect(again).toMatchObject({ position: null, reached: null, lang: 'en', rate: 1.5, underlines: read.underlines })
    expect(validateReading(again)).toEqual([])
    expect(read.reached).toBe('s2-p1') // a new object, the first one untouched
  })

  it('accepts a reading with no reached (stored before it existed) and refuses one that is not a block id', () => {
    const { reached: _reached, ...old } = emptyReading()
    expect(validateReading(old)).toEqual([])
    expect(validateReading({ ...emptyReading(), reached: 3 })).toEqual(['reached is not null or a block id'])
  })
})

describe('the reading client: markers', () => {
  it('sends a marker, or null to clear it', async () => {
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }))
    vi.stubGlobal('fetch', fetch)
    const client = createClient()
    await client.setQueue('sample-a', 'first')
    await client.setQueue('sample-a', null)
    expect(fetch).toHaveBeenNthCalledWith(1, 'api/library/sample-a', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ queue: 'first' }) }))
    expect(fetch).toHaveBeenNthCalledWith(2, 'api/library/sample-a', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ queue: null }) }))
    vi.unstubAllGlobals()
  })
})
